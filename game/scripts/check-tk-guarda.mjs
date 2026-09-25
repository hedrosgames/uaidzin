import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_GUARDA_URL ?? "http://127.0.0.1:5173/vfx/tk-guarda.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_GUARDA__)");
await evaluate(`window.__TK_GUARDA_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_GUARDA__;
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
    ok(opening.casts === 1 && opening.phase === 'rise', 'Guarda inicia erguendo: ' + target.join(','));
    const shell = api.scene.getObjectByName('tk-guarda-shell');
    ok(shell?.isMesh && shell.geometry.type === 'BufferGeometry', 'Guarda é meia-casca esférica facetada 3D: ' + target.join(','));
    ok([shell.position.x, shell.position.y, shell.position.z].every(Number.isFinite), 'Posição da casca finita: ' + target.join(','));
    const rimTop = api.scene.getObjectByName('tk-guarda-rim-top');
    const rimBottom = api.scene.getObjectByName('tk-guarda-rim-bottom');
    ok(rimTop?.isMesh && rimBottom?.isMesh && rimTop.parent === shell.parent, 'Rims de ouro acompanham a casca: ' + target.join(','));
    const aura = api.scene.getObjectByName('tk-guarda-aura');
    ok(aura?.isMesh && aura.parent !== shell.parent, 'Aura baixa é semi-anel no chão: ' + target.join(','));
    const openingState = opening.castStates[0];
    ok(Number.isFinite(openingState.shellScale) && openingState.shellScale < 1, 'Casca começa menor e cresce: ' + target.join(','));
    ok(openingState.wavesTriggered === 0, 'Nenhuma onda antes de 0,25 s: ' + target.join(','));
    ok(opening.particleSystems[2]?.visible === true, 'Motas da aura ativas desde o início: ' + target.join(','));
    api.advance(15/60);
    const waveOne = api.getState();
    ok(waveOne.castStates[0].wavesTriggered >= 1, 'Primeira onda de resistência em ~0,25 s: ' + target.join(','));
    ok(waveOne.particleSystems[0]?.particles > 0, 'Faíscas de impacto na primeira onda: ' + target.join(','));
    ok(waveOne.castStates[0].rippleAges[0] >= 0, 'Ripple vermelho abre na primeira onda: ' + target.join(','));
    api.advance(33/60);
    const allWaves = api.getState();
    ok(allWaves.castStates[0].wavesTriggered === 3, 'Três ondas de resistência até 0,8 s: ' + target.join(','));
    api.advance(0.7);
    const hold = api.getState();
    ok(hold.phase === 'fade' && Math.abs(hold.castStates[0].elapsed - 1.5) < 1/60 + 1e-9, 'Escuda resiste até 1,5 s antes de desvanecer: ' + target.join(','));
    const light = api.scene.getObjectByProperty('isPointLight', true);
    ok(light && light.intensity > 0, 'Luz pontual acompanha a guarda: ' + target.join(','));
    directions.push({ target, scales: [openingState.shellScale, waveOne.castStates[0].shellScale, hold.castStates[0].shellScale], waves: allWaves.castStates[0].wavesTriggered, shellPosition: hold.castStates[0].shellPosition });
    api.advance(0.8);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-guarda-shell'), 'Casca removida da cena: ' + target.join(','));
  }
  api.setTarget(0,0,2.6);
  const scales = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(1/60);
    scales.push(JSON.stringify(api.getState().castStates.map(state => [state.shellScale, state.elapsed, state.shellOpacity, state.auraOpacity])));
    api.advance(2.2);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(scales).size === 1, 'Materialização determinística entre disparos');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
  const before = api.getState().target;
  api.setTarget(NaN, Infinity, 0);
  ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
  const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
  const { GuardaVfxController, DEFAULT_GUARDA_VFX_CONFIG } = await import('/src/presentation/effects/tkSkills/guarda/GuardaVfx.ts');
  const scene = new THREE.Scene();
  const controller = new GuardaVfxController(scene);
  controller.castGuarda(new THREE.Vector3(NaN,0,0), new THREE.Vector3(0,0,1));
  ok(controller.getActiveCastCount() === 0, 'Origem inválida recusada');
  controller.castGuarda(new THREE.Vector3(), new THREE.Vector3(NaN,0,1));
  ok(controller.getActiveCastCount() === 0, 'Direção inválida recusada');
  controller.castGuarda(new THREE.Vector3(), new THREE.Vector3(0,0,0));
  ok(controller.getActiveCastCount() === 0, 'Direção nula recusada');
  controller.castGuarda(new THREE.Vector3(), new THREE.Vector3(0,9,0));
  ok(controller.getActiveCastCount() === 0, 'Direção sem componente horizontal recusada');
  for (let i = 0; i < 8; i++) controller.castGuarda(new THREE.Vector3(), new THREE.Vector3(i + 1,0,i % 3));
  ok(controller.getActiveCastCount() === DEFAULT_GUARDA_VFX_CONFIG.maxConcurrentCasts, 'Limite de guardas simultâneos respeitado');
  ok(controller.getSystems().length === DEFAULT_GUARDA_VFX_CONFIG.maxConcurrentCasts * 3, 'Três sistemas de partículas por guarda');
  controller.clear();
  ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
  for (const fps of [30, 60, 144]) {
    controller.castGuarda(new THREE.Vector3(), new THREE.Vector3(2,0,1));
    ok(controller.getPhase() === 'rise', 'Guarda começa erguendo a ' + fps + ' fps');
    let steps = 0;
    while (controller.getPhase() === 'rise' && steps < 96) {
      controller.update(1/fps);
      steps += 1;
    }
    const state = controller.getCastStates()[0];
    ok(controller.getPhase() === 'hold', 'Transição para resistência a ' + fps + ' fps');
    ok(Math.abs(state.elapsed - DEFAULT_GUARDA_VFX_CONFIG.riseDuration) < 1/60 + 1e-9, 'Duração da subida estável a ' + fps + ' fps');
    controller.clear();
  }
  controller.dispose(); controller.dispose();
  ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0,2.6); api.cast(); api.advance(1/60);
  return { checks, directions, memory, skillId: 'tk_ctrl_7' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_ctrl_7" };
const targets = [[0,0,2.6],[2.6,0,0],[-2.6,0,0],[0,0,-2.6],
  [1.9,0,1.9],[-1.9,0,-1.9],[2.6,0,2.6],[-2.6,0,2.6],
  [0,0,0.4],[0,0,6],[-0.4,0,0.4]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_GUARDA_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_GUARDA_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_GUARDA_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 60);
await command("select", "#target-direction", "0");
await evaluate("window.__UAIDZIN_TK_GUARDA__.setTarget(0,0,2.6)");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_GUARDA__.getState().target"), [0, 0, 2.6]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_GUARDA__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_GUARDA__.getState().paused"), true);
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_GUARDA__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_GUARDA__;
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
const rotated = await evaluate("window.__UAIDZIN_TK_GUARDA__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_GUARDA__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_GUARDA__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-guarda-rise", "api.clear(); api.setTarget(0,0,2.6); api.cast(); api.advance(1/60);"],
  ["tk-guarda-wave", "api.advance(14/60);"],
  ["tk-guarda-hold", "api.advance(30/60);"],
  ["tk-guarda-top", "api.clear(); api.cast(); api.advance(2/60); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0.6); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_GUARDA__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_GUARDA__.renderer;
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
await fs.writeFile(path.join(output, "tk-guarda-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
