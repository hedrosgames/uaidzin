import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_MACHADO_URL ?? "http://127.0.0.1:5173/vfx/tk-machado.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_MACHADO__)");
await evaluate(`window.__TK_MACHADO_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_MACHADO__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.07);
    const fall = api.getState();
    const cast = fall.machados[0];
    ok(fall.casts === 1, 'Um machado por cast: ' + target.join(','));
    ok(fall.phase === 'fall' && cast.axeVisible, 'Machado visível em queda: ' + target.join(','));
    ok(Array.from(cast.axe).every(Number.isFinite), 'Posição do machado finita: ' + target.join(','));
    ok(cast.axe[1] > cast.target[1] + 0.5, 'Machado acima do alvo em queda: ' + target.join(','));
    ok(cast.progress > 0 && cast.progress < 1, 'Queda em progresso: ' + target.join(','));
    const axe = api.scene.getObjectByName('tk-machado-axe');
    ok(axe?.isObject3D && axe.children.length >= 2, 'Machado volumétrico (cabo + lâmina): ' + target.join(','));
    axe.traverse(object => {
      if (object.isMesh) ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite),
        'Geometria finita: ' + target.join(','));
    });
    ok(fall.particleSystems.slice(-2).every(system => system.particles === 0), 'Sem estilhaços antes do contato: ' + target.join(','));
    ok(fall.particleSystems.slice(0, 2).some(system => system.particles > 0), 'Rastro de fogo na queda: ' + target.join(','));
    const beforeY = cast.axe[1];
    api.advance(1/30);
    const laterFall = api.getState().machados[0];
    ok(laterFall.axe[1] < beforeY, 'Machado desce entre quadros: ' + target.join(','));
    api.advance(5/60);
    const contact = api.getState();
    ok(contact.phase === 'impact', 'Impacto em até 0,15 s: ' + target.join(','));
    const impact = contact.machados[0];
    ok(!impact.axeVisible, 'Machado some no contato: ' + target.join(','));
    ok(contact.particleSystems.slice(-2).every(system => system.particles > 0), 'Estilhaços e pluma no contato: ' + target.join(','));
    const shock = api.scene.getObjectByName('tk-machado-shock');
    ok(shock?.isMesh && shock.material.opacity > 0, 'Anel de choque no chão: ' + target.join(','));
    const light = api.scene.children.flatMap(object => object.isPointLight ? [object] :
      object.children?.filter(child => child.isPointLight) ?? []);
    ok(light.some(point => point.intensity > 3), 'PointLight forte no impacto: ' + target.join(','));
    ok(impact.elapsed === 0.15, 'Duração da queda fixa em 0,15 s: ' + target.join(','));
    directions.push({ target, axeAtImpact: impact.axe, impactAge: impact.impactAge });
    api.advance(1.2);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-machado-shock') && !api.scene.getObjectByName('tk-machado-axe'),
      'Cena limpa após ciclo: ' + target.join(','));
  }
  api.setTarget(0,0.05,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    ok(api.getState().casts === 0 && api.getState().systems === 0,
      'Machado anterior encerra antes do próximo disparo: ' + i);
    api.clear();
    api.cast();
    api.advance(0.07);
    paths.push(JSON.stringify(api.getState().machados[0].axe));
    api.advance(1.2);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(paths).size === 1, 'Rastros determinísticos entre disparos');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    api.setTarget(NaN, Infinity, 0);
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { MachadoVfxController } = await import('/src/presentation/effects/tkSkills/machado/MachadoVfx.ts');
    const scene = new THREE.Scene();
    const controller = new MachadoVfxController(scene);
    controller.castMachado(new THREE.Vector3(NaN, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castMachado(new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três machados simultâneos');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castMachado(new THREE.Vector3(2, 0.05, 1));
      let elapsed = 0;
      while (elapsed + 1/fps < 0.15 - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      ok(controller.getPhase() === 'fall', 'Sem impacto antecipado a ' + fps + ' fps');
      controller.update(0.15 - elapsed);
      ok(controller.getPhase() === 'impact' && controller.getCastStates()[0].elapsed === 0.15,
        'Impacto em 0,15 s a ' + fps + ' fps');
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
  [-3,0.05,3.4],[-3,0.05,-3.4],[0,4.4,0],[0,0.05,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_MACHADO_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_MACHADO_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_MACHADO_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_MACHADO__.getState().target"), [0, 4.4, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_MACHADO__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_MACHADO__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_MACHADO__.getState().speed"), 0.25);
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-machado-fall", "api.clear(); api.cast(); api.advance(0.07);"],
  ["tk-machado-impact", "api.advance(5/60);"],
  ["tk-machado-top", "api.clear(); api.cast(); api.advance(0.15); api.camera.position.set(0,11,0.1); api.camera.lookAt(0,0.6,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_MACHADO__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_MACHADO__.renderer;
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
await fs.writeFile(path.join(output, "tk-machado-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1) }, null, 2)}\n`);
