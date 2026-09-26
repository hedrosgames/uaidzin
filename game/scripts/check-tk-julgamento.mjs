import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_JULGAMENTO_URL ?? "http://127.0.0.1:5173/vfx/tk-julgamento.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_JULGAMENTO__)");
await evaluate(`window.__TK_JULGAMENTO_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_JULGAMENTO__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.05);
    const casting = api.getState();
    const cast = casting.julgamentos[0];
    ok(casting.casts === 1, 'Um julgamento por cast: ' + target.join(','));
    ok(casting.phase === 'beam', 'Fase de raios após cast: ' + target.join(','));
    ok(cast.bolts.length === 3, 'Três raios por julgamento: ' + target.join(','));
    const first = cast.bolts[0];
    ok(first.beamVisible, 'Primeiro raio visível: ' + target.join(','));
    ok(first.beamExtent > 0 && first.beamExtent < 1, 'Primeiro raio descendo: ' + target.join(','));
    ok(!cast.bolts[1].beamVisible && !cast.bolts[2].beamVisible, 'Raios seguintes aguardam: ' + target.join(','));
    const beam = api.scene.getObjectByName('tk-julgamento-beam-0');
    ok(beam?.isObject3D && beam.geometry.attributes.position, 'Coluna de luz volumétrica: ' + target.join(','));
    beam.traverse(object => {
      if (object.isMesh) ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite),
        'Geometria finita: ' + target.join(','));
    });
    ok(casting.particleSystems.slice(1, 3).every(system => system.particles === 0), 'Sem faíscas antes do primeiro contato: ' + target.join(','));
    api.advance(1/30);
    const later = api.getState().julgamentos[0];
    ok(later.bolts[0].beamExtent > first.beamExtent, 'Raio desce entre quadros: ' + target.join(','));
    api.advance(1/20);
    const contact = api.getState();
    ok(contact.phase === 'impact' && cast.bolts[0].phase !== 'wait', 'Primeiro impacto em até 0,15 s: ' + target.join(','));
    ok(contact.particleSystems.slice(0, 3).every(system => system.particles > 0), 'Faíscas e pluma no primeiro contato: ' + target.join(','));
    const shock = api.scene.getObjectByName('tk-julgamento-shock-0');
    ok(shock?.isMesh && shock.material.opacity > 0, 'Anel de choque no chão: ' + target.join(','));
    const light = api.scene.children.flatMap(object => object.isPointLight ? [object] :
      object.children?.filter(child => child.isPointLight) ?? []);
    ok(light.some(point => point.intensity > 3), 'PointLight forte no impacto: ' + target.join(','));
    api.advance(0.12);
    const second = api.getState().julgamentos[0];
    ok(second.bolts[1].beamVisible || second.bolts[1].impactAge > 0, 'Segundo raio após 0,15 s: ' + target.join(','));
    ok(!second.bolts[2].beamVisible && second.bolts[2].phase === 'wait', 'Terceiro raio ainda aguarda: ' + target.join(','));
    api.advance(0.2);
    const finale = api.getState().julgamentos[0];
    ok(finale.bolts.every(bolt => bolt.phase === 'impact'), 'Todos os raios caíram: ' + target.join(','));
    ok(finale.bolts[2].scale === 1.3, 'Raio final 1,3x maior: ' + target.join(','));
    directions.push({ target, bolts: finale.bolts.map(bolt => ({ scale: bolt.scale, phase: bolt.phase })), impactAge: finale.bolts[0].impactAge });
    api.advance(1.3);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-julgamento-shock-0') && !api.scene.getObjectByName('tk-julgamento-beam-0'),
      'Cena limpa após ciclo: ' + target.join(','));
  }
  api.setTarget(0,0.05,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.05);
    paths.push(JSON.stringify(api.getState().julgamentos[0].bolts.map(bolt => bolt.beamExtent)));
    api.advance(1.5);
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
    const { JulgamentoVfxController } = await import('/src/presentation/effects/tkSkills/julgamento/JulgamentoVfx.ts');
    const scene = new THREE.Scene();
    const controller = new JulgamentoVfxController(scene);
    controller.castJulgamento(new THREE.Vector3(NaN, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castJulgamento(new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três julgamentos simultâneos');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castJulgamento(new THREE.Vector3(2, 0.05, 1));
      let elapsed = 0;
      while (elapsed + 1/fps < 0.12 - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      ok(controller.getPhase() === 'beam', 'Sem impacto antecipado a ' + fps + ' fps');
      controller.update(0.12 - elapsed + 1/60);
      ok(controller.getPhase() === 'impact', 'Impacto do primeiro raio em 0,12 s a ' + fps + ' fps');
      ok(Math.abs(controller.getCastStates()[0].elapsed - 0.12) <= 1/60 + 1e-6,
        'Impacto dentro de um passo fixo a ' + fps + ' fps');
      controller.clear();
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0.05,0); api.cast(); api.advance(0.05);
  return { checks, directions, memory };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [] };
const targets = [[0,0.05,0],[-4.5,0.05,0],[3.4,0.05,2.6],[3.4,0.05,-2.6],
  [-3,0.05,3.4],[-3,0.05,-3.4],[0,4.4,0],[5.5,0.05,-4.5],
  [-5.5,0.05,-4.5],[0,1.6,4.8],[0,0.05,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_JULGAMENTO_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 6; cycle++) {
  const result = await evaluate("window.__TK_JULGAMENTO_QA__([], 2, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12, "Menos de 12 ciclos de memória coletados");
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_JULGAMENTO_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_JULGAMENTO__.getState().target"), [0, 4.4, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_JULGAMENTO__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_JULGAMENTO__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_JULGAMENTO__.getState().speed"), 0.25);
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-julgamento-beam", "api.clear(); api.cast(); api.advance(0.05);"],
  ["tk-julgamento-impact", "api.advance(1/20);"],
  ["tk-julgamento-final", "api.advance(0.25); api.camera.position.set(0,7,9.5); api.camera.lookAt(0,0.8,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_JULGAMENTO__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_JULGAMENTO__.renderer;
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
await fs.writeFile(path.join(output, "tk-julgamento-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1) }, null, 2)}\n`);
