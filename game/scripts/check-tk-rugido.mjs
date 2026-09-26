import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_RUGIDO_URL ?? "http://127.0.0.1:5173/vfx/tk-rugido.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_RUGIDO__)");
await evaluate(`window.__TK_RUGIDO_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_RUGIDO__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(1/60);
    const state = api.getState();
    ok(state.phase === 'roar' && state.casts === 1, 'Rugido ativo no cast: ' + target.join(','));
    const castState = state.castStates[0];
    ok(castState.elapsed <= 0.1, 'Onda no início em 0,10 s: ' + target.join(','));
    const ring = api.scene.getObjectByName('rugido-ring-1');
    ok(ring?.isMesh && ring.geometry.type === 'RingGeometry', 'Anel de choque volumétrico: ' + target.join(','));
    ok(ring.scale.x > 0.35 && Number.isFinite(ring.scale.x), 'Anel expande do peito: ' + target.join(','));
    ok(state.particleSystems.some(system => system.particles > 0), 'Streaks de ar emitidos: ' + target.join(','));
    const flash = api.scene.getObjectByName('rugido-flash');
    ok(flash?.material.opacity > 0 && flash.visible, 'Clarão vermelho-brasa no peito: ' + target.join(','));
    ok(Math.abs(castState.flashOpacity - flash.material.opacity) < 1e-6, 'Flash coerente com estado: ' + target.join(','));
    const ringScaleBefore = ring.scale.x;
    api.advance(1/60);
    const nextCast = api.getState().castStates[0];
    const nextRing = api.scene.getObjectByName('rugido-ring-1');
    ok(nextRing.scale.x > ringScaleBefore, 'Anel avança em passos fixos: ' + target.join(','));
    ok(nextCast.ringOpacity < castState.ringOpacity, 'Onda dissipa: ' + target.join(','));
    ok(nextCast.lightIntensity < castState.lightIntensity, 'Luz decai: ' + target.join(','));
    api.advance(0.14);
    const mid = api.getState().castStates[0];
    ok(mid.ringSecondaryVisible, 'Segundo anel em velocidade própria: ' + target.join(','));
    api.advance(0.85);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Dissipação até 0,95 s sem resíduo: ' + target.join(','));
    ok(!api.scene.getObjectByName('rugido-ring-1'), 'Cena limpa após dissipação: ' + target.join(','));
    directions.push({ target, ring: nextRing.scale.x });
    api.clear();
  }
  api.setTarget(-3.7,1.25,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(1/60);
    paths.push(JSON.stringify(api.getState().castStates[0]));
    api.advance(1.0);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(paths).size === 1, 'Rugidos determinísticos entre disparos');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    api.setTarget(NaN, Infinity, 0);
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { RugidoVfxController } = await import('/src/presentation/effects/tkSkills/rugido/RugidoVfx.ts');
    const scene = new THREE.Scene();
    const controller = new RugidoVfxController(scene);
    controller.castRugido(new THREE.Vector3(NaN,0,0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castRugido(new THREE.Vector3(i + 1,1.25,0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três rugidos simultâneos');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castRugido(new THREE.Vector3(2,1.25,0));
      let elapsed = 0;
      let ringMoved = false;
      let previous = null;
      while (elapsed + 1/fps < 0.95 - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
        const snapshot = JSON.stringify(controller.getCastStates()[0]?.ringScale ?? 0);
        if (previous !== null && snapshot !== previous) ringMoved = true;
        previous = snapshot;
      }
      ok(controller.getPhase() !== 'idle', 'Rugido não encerra antes de 0,95 s a ' + fps + ' fps');
      controller.update(0.95 - elapsed + 1/60);
      ok(controller.getPhase() === 'idle', 'Dissipação completa em 0,95 s a ' + fps + ' fps');
      ok(ringMoved, 'Onda animada em passos fixos a ' + fps + ' fps');
      controller.clear();
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(-3.7,1.25,0); api.cast(); api.advance(1/60);
  return { checks, directions, memory, skillId: 'tk_ctrl_3' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_ctrl_3" };
const targets = [[-3.7,1.25,0],[2.5,1.25,0],[-3.45,1.25,5],[-3.45,1.25,-5],
  [1.5,1.25,4],[1.5,1.25,-4],[-7,1.25,4],[-7,1.25,-4],
  [-3.45,4.5,0],[-3.45,1.1,0],[-3.45,1.45,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_RUGIDO_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 6; cycle++) {
  const result = await evaluate("window.__TK_RUGIDO_QA__([], 2, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_RUGIDO_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_RUGIDO__.getState().target"), [-3.45, 4.5, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_RUGIDO__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_RUGIDO__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_RUGIDO__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_RUGIDO__;
  api.clear(); api.cast(); api.advance(1/60);
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
const rotated = await evaluate("window.__UAIDZIN_TK_RUGIDO__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_RUGIDO__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_RUGIDO__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["posição elevada", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-rugido-impact", "api.clear(); api.cast(); api.advance(1/60);"],
  ["tk-rugido-onda-dupla", "api.advance(0.16);"],
  ["tk-rugido-dissipacao", "api.advance(0.5);"],
  ["tk-rugido-top", "api.clear(); api.cast(); api.advance(1/60); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_RUGIDO__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_RUGIDO__.renderer;
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
await fs.writeFile(path.join(output, "tk-rugido-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
