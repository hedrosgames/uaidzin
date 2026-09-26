import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_AVALANCHE_URL ?? "http://127.0.0.1:5173/vfx/tk-avalanche.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_AVALANCHE__)");
await evaluate(`window.__TK_AVALANCHE_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_AVALANCHE__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    ok(api.setTarget(...target) === true, 'Alvo aceito: ' + target.join(','));
    api.cast();
    api.advance(0.06);
    let state = api.getState();
    ok(state.casts === 1 && state.phase === 'wave', 'Onda em avanço: ' + target.join(','));
    const first = state.castStates[0];
    ok(first.impacts.length === 5 && first.triggeredCount === 0, 'Nenhum impacto antes de 0,30 do alcance: ' + target.join(','));
    ok(state.particleSystems.some(system => system.particles > 0), 'Poeira acompanha a frente: ' + target.join(','));
    const arc = api.scene.getObjectByName('avalanche-wave-arc');
    const body = api.scene.getObjectByName('avalanche-wave-body');
    ok(arc?.isMesh && body?.isMesh, 'Malhas volumétricas da onda: ' + target.join(','));
    ok([arc.position.x, arc.position.y, arc.position.z, body.scale.x, body.scale.z].every(Number.isFinite), 'Transformações finitas: ' + target.join(','));
    api.advance(2/60);
    state = api.getState();
    ok(state.castStates[0].triggeredCount === 1, 'Primeiro impacto no pé do cone: ' + target.join(','));
    if (target[1] > 1) ok(state.castStates[0].front[1] > state.castStates[0].origin[1], 'Onda sobe a rampa: ' + target.join(','));
    if (target[1] < 0) ok(state.castStates[0].front[1] < state.castStates[0].origin[1], 'Onda desce a rampa: ' + target.join(','));
    ok(state.particleSystems.slice(2, 4).every(system => system.particles > 0), 'Detritos no primeiro impacto: ' + target.join(','));
    let guard = 0;
    while (api.getState().phase === 'wave' && guard < 30) { api.advance(1/60); guard++; }
    state = api.getState();
    ok(state.phase === 'aftermath', 'Onda completa: ' + target.join(','));
    const finished = state.castStates[0];
    ok(finished.elapsed === 0.25, 'Duração fixa de 0,25 s: ' + target.join(','));
    ok(finished.triggeredCount === 5, 'Cinco impactos escalonados: ' + target.join(','));
    const times = finished.impacts.map(impact => impact.triggerTime);
    ok(times.every((time, index) => index === 0 || time > times[index - 1]), 'Impactos em ordem de distância: ' + target.join(','));
    ok(finished.impacts.every(impact => Math.abs(impact.triggerTime - impact.fraction * 0.25) <= 1/60 + 1e-6), 'Timing dos impactos dentro de um passo: ' + target.join(','));
    api.advance(2.5);
    state = api.getState();
    ok(state.casts === 0 && state.particles === 0 && state.systems === 0, 'Limpeza completa: ' + target.join(','));
    directions.push({ target, triggerTimes: times, front: finished.front });
  }
  api.setTarget(3.7, 0.08, 0);
  const memories = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.05);
    memories.push(api.getState().memory);
    api.advance(3);
  }
  if (repetitions > 0) {
    ok(memories.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memories[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    ok(api.setTarget(NaN, Infinity, 0) === false, 'setTarget recusa coordenadas inválidas');
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { AvalancheVfxController } = await import('/src/presentation/effects/tkSkills/avalanche/AvalancheVfx.ts');
    const scene = new THREE.Scene();
    const controller = new AvalancheVfxController(scene);
    controller.castAvalanche(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(2, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castAvalanche(new THREE.Vector3(), new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 3 && controller.getSystems().length === 36, 'Limite de três ondas, doze sistemas cada');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castAvalanche(new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(5.5, 0.08, 2));
      let fed = 0;
      while (fed + 1/fps < 0.2 - 1e-9) { controller.update(1/fps); fed += 1/fps; }
      ok(controller.getPhase() === 'wave', 'Sem fim antecipado a ' + fps + ' fps');
      let guard = 0;
      while (controller.getPhase() === 'wave' && guard < 40) { controller.update(1/fps); guard++; }
      const castState = controller.getCastStates()[0];
      ok(controller.getPhase() === 'aftermath' && castState.elapsed === 0.25, 'Onda completa em 0,25 s a ' + fps + ' fps');
      ok(castState.triggeredCount === 5, 'Cinco impactos a ' + fps + ' fps');
      const times = castState.impacts.map(impact => impact.triggerTime);
      ok(times.every((time, index) => index === 0 || time > times[index - 1]), 'Impactos escalonados a ' + fps + ' fps');
      ok(Math.abs(times[times.length - 1] - 0.25) <= 1/60 + 1e-6, 'Último impacto no fim da onda a ' + fps + ' fps');
      controller.clear();
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(3.7, 0.08, 0); api.cast(); api.advance(0.06);
  return { checks, directions, memories, skillId: 'tk_fis_7' };
}; true`);
const results = { checks: [], directions: [], memories: [], inputLimitations: [], skillId: "tk_fis_7" };
const targets = [[3.7,0.08,0],[-10,0.08,0],[-3.45,0.08,6],[-3.45,0.08,-6],
  [1.5,0.08,4],[1.5,0.08,-4],[-7,0.08,4],[-7,0.08,-4],
  [-3.45,2.6,0],[3.7,-1.4,0],[-3.45,0.08,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_AVALANCHE_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_AVALANCHE_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memories.push(...result.memories);
}
assert(results.memories.every(value => JSON.stringify(value) === JSON.stringify(results.memories[0])));
const integration = await evaluate("window.__TK_AVALANCHE_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "5");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_AVALANCHE__.getState().target"), [3.7, 2.6, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_AVALANCHE__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_AVALANCHE__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_AVALANCHE__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_AVALANCHE__;
  api.clear(); api.cast(); api.advance(0.10);
  const rect = api.renderer.domElement.getBoundingClientRect();
  return { camera: api.camera.position.toArray(), x: rect.left + rect.width * 0.45, y: rect.top + rect.height * 0.4 };
})()`);
await command("mouse", "move", String(Math.round(orbit.x)), String(Math.round(orbit.y)));
await command("mouse", "down", "left");
try {
  await command("mouse", "move", String(Math.round(orbit.x + 90)), String(Math.round(orbit.y + 30)));
} finally {
  await command("mouse", "up", "left");
}
const rotated = await evaluate("window.__UAIDZIN_TK_AVALANCHE__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_AVALANCHE__.renderer.domElement;
    const capture = canvas.setPointerCapture;
    const release = canvas.releasePointerCapture;
    canvas.setPointerCapture = () => {};
    canvas.releasePointerCapture = () => {};
    try {
      const pointer = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
        pointerId: 1, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1,
        clientX: x, clientY: y, bubbles: true,
      }));
      pointer('pointerdown', 720, 360);
      pointer('pointermove', 810, 390);
      pointer('pointerup', 810, 390);
    } finally { canvas.setPointerCapture = capture; canvas.releasePointerCapture = release; }
  })()`);
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_AVALANCHE__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["rampa alta", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-avalanche-wave", "api.clear(); api.cast(); api.advance(0.10);"],
  ["tk-avalanche-impact", "api.advance(0.12);"],
  ["tk-avalanche-top", "api.clear(); api.cast(); api.advance(0.16); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_AVALANCHE__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_AVALANCHE__.renderer;
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
  results.inputLimitations.push("requestAnimationFrame suspenso no navegador integrado; duração e renderização testadas quadro a quadro, reprodução automática não verificada.");
}
await fs.writeFile(path.join(output, "tk-avalanche-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memories.at(-1), skillId: results.skillId }, null, 2)}\n`);
