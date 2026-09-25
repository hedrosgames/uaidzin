import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_MURALHA_URL ?? "http://127.0.0.1:5173/vfx/tk-muralha.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_MURALHA__)");
await evaluate(`window.__TK_MURALHA_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_MURALHA__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(1/60);
    const opening = api.getState();
    ok(opening.casts === 1 && opening.phase === 'materialize', 'Muralha inicia em materialize: ' + target.join(','));
    const wall = api.scene.getObjectByName('tk-muralha-wall');
    ok(wall?.isInstancedMesh && wall.geometry.type === 'BufferGeometry', 'Muralha é parede de blocos instanciados: ' + target.join(','));
    ok(wall.count === opening.castStates[0].blockCount && opening.castStates[0].blockCount > 0, 'Blocos instanciados presentes: ' + target.join(','));
    ok(Boolean(wall.instanceColor), 'Variação de cor por instância: ' + target.join(','));
    ok([wall.position.x, wall.position.y, wall.position.z].every(Number.isFinite), 'Posição da muralha finita: ' + target.join(','));
    const rimTop = api.scene.getObjectByName('tk-muralha-rim-top');
    ok(rimTop?.isMesh && rimTop.parent === wall.parent, 'Rim ouro acompanha a muralha: ' + target.join(','));
    const openingState = opening.castStates[0];
    ok(Number.isFinite(openingState.progress) && openingState.progress > 0, 'Erguimento começa no primeiro passo: ' + target.join(','));
    ok(opening.particleSystems.length === 4, 'Quatro sistemas de partículas por lanço: ' + target.join(','));
    api.advance(1/60);
    const growing = api.getState();
    ok(growing.phase === 'materialize' && growing.castStates[0].progress > openingState.progress, 'Muralha cresce durante a materialização: ' + target.join(','));
    api.advance(0.67);
    const risen = api.getState();
    ok(risen.phase === 'persist', 'Materialização termina em 0,7 s: ' + target.join(','));
    ok(Math.abs(risen.castStates[0].elapsed - 0.7) < 1/60 + 1e-9, 'Duração da materialização fixa em 0,7 s: ' + target.join(','));
    ok(risen.castStates[0].rimOpacity > 0.3, 'Rim ouro visível na aresta: ' + target.join(','));
    ok(risen.castStates[0].pebblesSpawned, 'Pedras soltas do topo: ' + target.join(','));
    const light = api.scene.getObjectByProperty('isPointLight', true);
    ok(light && light.intensity > 0, 'Luz pontual acompanha a muralha: ' + target.join(','));
    directions.push({ target, progress: [openingState.progress, growing.castStates[0].progress, risen.castStates[0].progress], wallPosition: risen.castStates[0].wallPosition });
    api.advance(1.0);
    const crumbling = api.getState();
    ok(crumbling.phase === 'crumble', 'Persistência termina em desmanche: ' + target.join(','));
    api.advance(1.0);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-muralha-wall'), 'Muralha removida da cena: ' + target.join(','));
  }
  api.setTarget(0,0,2.6);
  const progresses = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(1/60);
    progresses.push(JSON.stringify(api.getState().castStates.map(state => [state.progress, state.rimOpacity, state.wallOpacity])));
    api.advance(2.8);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(progresses).size === 1, 'Materialização determinística entre disparos');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
  const before = api.getState().target;
  api.setTarget(NaN, Infinity, 0);
  ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
  const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
  const { MuralhaVfxController, DEFAULT_MURALHA_VFX_CONFIG } = await import('/src/presentation/effects/tkSkills/muralha/MuralhaVfx.ts');
  const scene = new THREE.Scene();
  const controller = new MuralhaVfxController(scene);
  controller.castMuralha(new THREE.Vector3(NaN,0,0), new THREE.Vector3(0,0,1));
  ok(controller.getActiveCastCount() === 0, 'Origem inválida recusada');
  controller.castMuralha(new THREE.Vector3(), new THREE.Vector3(NaN,0,1));
  ok(controller.getActiveCastCount() === 0, 'Direção inválida recusada');
  controller.castMuralha(new THREE.Vector3(), new THREE.Vector3(0,0,0));
  ok(controller.getActiveCastCount() === 0, 'Direção nula recusada');
  controller.castMuralha(new THREE.Vector3(), new THREE.Vector3(0,9,0));
  ok(controller.getActiveCastCount() === 0, 'Direção sem componente horizontal recusada');
  for (let i = 0; i < 8; i++) controller.castMuralha(new THREE.Vector3(), new THREE.Vector3(i + 1,0,i % 3));
  ok(controller.getActiveCastCount() === DEFAULT_MURALHA_VFX_CONFIG.maxConcurrentCasts, 'Limite de muralhas simultâneas respeitado');
  ok(controller.getSystems().length === DEFAULT_MURALHA_VFX_CONFIG.maxConcurrentCasts * 4, 'Quatro sistemas de partículas por muralha');
  controller.clear();
  ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
  for (const fps of [30, 60, 144]) {
    controller.castMuralha(new THREE.Vector3(), new THREE.Vector3(2,0,1));
    ok(controller.getPhase() === 'materialize', 'Muralha começa em materialize a ' + fps + ' fps');
    let steps = 0;
    while (controller.getPhase() === 'materialize' && steps < 128) {
      controller.update(1/fps);
      steps += 1;
    }
    const state = controller.getCastStates()[0];
    ok(controller.getPhase() === 'persist', 'Transição para persistência a ' + fps + ' fps');
    ok(Math.abs(state.elapsed - DEFAULT_MURALHA_VFX_CONFIG.materializeDuration) < 1/60 + 1e-9, 'Duração estável a ' + fps + ' fps');
    controller.clear();
  }
  controller.dispose(); controller.dispose();
  ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0,2.6); api.cast(); api.advance(1/60);
  return { checks, directions, memory, skillId: 'tk_ctrl_4' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_ctrl_4" };
const targets = [[0,0,2.6],[2.6,0,0],[-2.6,0,0],[0,0,-2.6],
  [1.9,0,1.9],[-1.9,0,-1.9],[2.6,0,2.6],[-2.6,0,2.6],
  [0,0,0.4],[0,0,6],[-0.4,0,0.4]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_MURALHA_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_MURALHA_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_MURALHA_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 60);
await command("select", "#target-direction", "0");
await evaluate("window.__UAIDZIN_TK_MURALHA__.setTarget(0,0,2.6)");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_MURALHA__.getState().target"), [0, 0, 2.6]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_MURALHA__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_MURALHA__.getState().paused"), true);
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_MURALHA__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_MURALHA__;
  api.clear(); api.cast(); api.advance(1/60);
  const rect = api.renderer.domElement.getBoundingClientRect();
  return { camera: api.camera.position.toArray(), x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.4 };
})()`);
await command("mouse", "move", String(Math.round(orbit.x)), String(Math.round(orbit.y)));
await command("mouse", "down", "left");
try {
  await command("mouse", "move", String(Math.round(orbit.x + 90)), String(Math.round(orbit.y + 30)));
} finally {
  await command("mouse", "up", "left");
}
const rotated = await evaluate("window.__UAIDZIN_TK_MURALHA__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_MURALHA__.renderer.domElement;
    const capture = canvas.setPointerCapture;
    const release = canvas.releasePointerCapture;
    canvas.setPointerCapture = () => {};
    canvas.releasePointerCapture = () => {};
    try {
      const pointer = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
        pointerId: 1, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1,
        clientX: x, clientY: y, bubbles: true,
      }));
      pointer('pointerdown', 800, 360);
      pointer('pointermove', 890, 390);
      pointer('pointerup', 890, 390);
    } finally { canvas.setPointerCapture = capture; canvas.releasePointerCapture = release; }
  })()`);
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_MURALHA__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-muralha-materialize", "api.clear(); api.setTarget(0,0,2.6); api.cast(); api.advance(1/60);"],
  ["tk-muralha-risen", "api.advance(8/60);"],
  ["tk-muralha-persist", "api.advance(7/12);"],
  ["tk-muralha-crumble", "api.advance(1.2);"],
  ["tk-muralha-top", "api.clear(); api.cast(); api.advance(2/60); api.camera.position.set(0,12,1.5); api.camera.lookAt(0,1,1.4); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_MURALHA__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_MURALHA__.renderer;
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
await fs.writeFile(path.join(output, "tk-muralha-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
