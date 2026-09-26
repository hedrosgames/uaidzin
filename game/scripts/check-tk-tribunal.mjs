import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_TRIBUNAL_URL ?? "http://127.0.0.1:5173/vfx/tk-tribunal.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_TRIBUNAL__)");
await evaluate(`window.__TK_TRIBUNAL_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_TRIBUNAL__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.07);
    const descent = api.getState();
    const cast = descent.tribunals[0];
    ok(descent.casts === 1, 'Um tribunal por cast: ' + target.join(','));
    ok(descent.phase === 'descent', 'Pilares em descida: ' + target.join(','));
    ok(cast.pillars.length === 5, 'Cinco pilares no círculo: ' + target.join(','));
    ok(cast.pillars.every(pillar => !pillar.landed), 'Pilares acima do alvo em descida: ' + target.join(','));
    ok(cast.pillars.every(pillar => Array.from(pillar.head).every(Number.isFinite)), 'Cabeças de pilar finitas: ' + target.join(','));
    ok(cast.pillars.every((pillar, index, all) => index === 0 ||
      Math.hypot(pillar.head[0] - all[index - 1].head[0], pillar.head[2] - all[index - 1].head[2]) > 1),
      'Pilares distribuídos no círculo: ' + target.join(','));
    const columns = api.scene.children.flatMap(object => object.name === 'tk-tribunal-pillar' ? [object] :
      object.children?.filter(child => child.name === 'tk-tribunal-pillar') ?? []);
    ok(columns.length === 5, 'Colunas volumétricas no palco: ' + target.join(','));
    columns.forEach(column => ok(Array.from(column.geometry.attributes.position.array).every(Number.isFinite),
      'Geometria da coluna finita: ' + target.join(',')));
    ok(descent.particleSystems.length > 0 && descent.particleSystems.some(system => system.particles > 0),
      'Rastro de fogo na descida: ' + target.join(','));
    const beforeY = cast.pillars[0].head[1];
    api.advance(1/30);
    const laterDescent = api.getState().tribunals[0];
    ok(laterDescent.pillars[0].head[1] < beforeY, 'Pilares descem entre quadros: ' + target.join(','));
    api.advance(11/60);
    const touchdown = api.getState();
    ok(touchdown.phase === 'fissures', 'Pilares aterrissam juntos em 0,25 s: ' + target.join(','));
    ok(touchdown.tribunals[0].pillars.every(pillar => pillar.landed), 'Todos os pilares pousados: ' + target.join(','));
    const shock = api.scene.getObjectByName('tk-tribunal-shock');
    ok(shock?.isMesh && shock.material.opacity > 0, 'Anel de choque no pouso: ' + target.join(','));
    api.advance(0.3);
    const fissured = api.getState();
    ok(fissured.phase === 'fissures' || fissured.phase === 'impact', 'Fase de fissuras ativa: ' + target.join(','));
    ok(fissured.tribunals[0].fissures.every(fissure => fissure.visible && fissure.extension > 0.5),
      'Fissuras douradas abertas entre os pés: ' + target.join(','));
    ok(fissured.tribunals[0].fissureProgress > 0.5 && fissured.tribunals[0].fissureProgress < 1,
      'Progresso das fissuras acompanha a fase: ' + target.join(','));
    api.advance(1/12);
    const verdict = api.getState();
    ok(verdict.phase === 'impact', 'Impacto central final após fissuras: ' + target.join(','));
    ok(verdict.tribunals[0].lightIntensity > 8, 'Veredito com luz forte (pico 9,6): ' + target.join(','));
    const finalCore = api.scene.getObjectByName('tk-tribunal-final-core');
    ok(finalCore?.isMesh && finalCore.material.opacity > 0, 'Bloom central do veredito: ' + target.join(','));
    const finalShock = api.scene.getObjectByName('tk-tribunal-final-shock');
    ok(finalShock?.isMesh && finalShock.material.opacity > 0, 'Anel de choque final maior: ' + target.join(','));
    const light = api.scene.children.flatMap(object => object.isPointLight ? [object] :
      object.children?.filter(child => child.isPointLight) ?? []);
    ok(light.some(point => point.intensity > 3), 'PointLight viajando entre pilares: ' + target.join(','));
    directions.push({ target, impactAge: verdict.tribunals[0].impactAge, light: verdict.tribunals[0].light });
    api.advance(2.2);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-tribunal-final-core') && !api.scene.getObjectByName('tk-tribunal-pillar'),
      'Cena limpa após ciclo: ' + target.join(','));
  }
  api.setTarget(0,0.05,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    ok(api.getState().casts === 0 && api.getState().systems === 0,
      'Ciclo anterior encerra antes da próxima sentença: ' + i);
    api.clear();
    api.cast();
    api.advance(0.07);
    paths.push(JSON.stringify(api.getState().tribunals[0].pillars.map(pillar => pillar.head)));
    api.advance(2.2);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(paths).size === 1, 'Pilares determinísticos entre sentenças');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    api.setTarget(NaN, Infinity, 0);
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { TribunalVfxController } = await import('/src/presentation/effects/tkSkills/tribunal/TribunalVfx.ts');
    const scene = new THREE.Scene();
    const controller = new TribunalVfxController(scene);
    controller.castTribunal(new THREE.Vector3(NaN, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castTribunal(new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 2, 'Limite de dois tribunais simultâneos');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    const timeline = [0.25, 0.38, 0.63];
    for (const fps of [30, 60, 144]) {
      controller.castTribunal(new THREE.Vector3(2, 0.05, 1));
      let elapsed = 0;
      while (elapsed + 1/fps < timeline[0] - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      ok(controller.getPhase() === 'descent', 'Sem pouso antecipado a ' + fps + ' fps');
      controller.update(timeline[0] - elapsed + 1/60);
      ok(controller.getPhase() === 'fissures', 'Pouso em 0,25 s a ' + fps + ' fps');
      elapsed = timeline[0] + 1/60;
      while (elapsed + 1/fps < timeline[0] + timeline[1] - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      controller.update(timeline[0] + timeline[1] - elapsed + 2/60);
      ok(controller.getPhase() === 'impact', 'Veredito em 0,63 s a ' + fps + ' fps');
      controller.clear();
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0.05,0); api.cast(); api.advance(0.07);
  return { checks, directions, memory };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [] };
const targets = [[0,0.05,0],[-4.5,0.05,0],[3.4,0.05,2.6],[3.4,0.05,-2.6],
  [-3,0.05,3.4],[-3,0.05,-3.4],[0,4.4,0],[0,0.05,0],
  [5.2,0.05,0],[-5.2,0.05,-2],[0,0.05,4.6]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_TRIBUNAL_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_TRIBUNAL_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12, "Memória avaliada em menos de 12 ciclos.");
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_TRIBUNAL_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 60);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_TRIBUNAL__.getState().target"), [0, 4.4, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_TRIBUNAL__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_TRIBUNAL__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_TRIBUNAL__.getState().speed"), 0.25);
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-tribunal-descent", "api.clear(); api.cast(); api.advance(0.07);"],
  ["tk-tribunal-fissures", "api.advance(0.3);"],
  ["tk-tribunal-verdict", "api.advance(0.33);"],
  ["tk-tribunal-top", "api.clear(); api.cast(); api.advance(0.7); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,0.6,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_TRIBUNAL__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_TRIBUNAL__.renderer;
  return { error: renderer.getContext().getError(),
    shadersValid: renderer.info.programs.every(program => program.diagnostics?.runnable !== false) };
})()`);
assert.equal(results.webgl.error, 0);
assert.equal(results.webgl.shadersValid, true);
results.frameScheduling = await evaluate(`Promise.race([
  new Promise(resolve => requestAnimationFrame(() => resolve(true))),
  new Promise(resolve => setTimeout(() => resolve(false), 1000)),
])`);
if (!results.frameScheduling) {
  results.inputLimitations.push("requestAnimationFrame suspenso no navegador integrado; duração validada quadro a quadro, reprodução automática não verificada.");
}
await fs.writeFile(path.join(output, "tk-tribunal-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1) }, null, 2)}\n`);
