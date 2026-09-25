import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_PURIFICAR_URL ?? "http://127.0.0.1:5173/vfx/tk-purificar.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_PURIFICAR__)");
await evaluate(`window.__TK_PURIFICAR_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_PURIFICAR__;
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
    ok(state.phase === 'converge' && state.casts === 1, 'Implosão imediata no cast: ' + target.join(','));
    const motes = api.scene.getObjectByName('purificar-motes');
    ok(motes?.children.length === 42, 'Quarenta e dois mons de luz convergindo: ' + target.join(','));
    ok(state.castStates[0].motes.every(mote => mote.every(Number.isFinite)), 'Mons com posições finitas: ' + target.join(','));
    const firstSnapshot = JSON.stringify(state.castStates[0].motes);
    api.advance(1/60);
    const convergeState = api.getState();
    ok(JSON.stringify(convergeState.castStates[0].motes) !== firstSnapshot, 'Mons giram em espiral: ' + target.join(','));
    api.advance(0.32);
    const bloomState = api.getState();
    ok(bloomState.phase === 'bloom', 'Pausa de brilho após a implosão: ' + target.join(','));
    const flash = api.scene.getObjectByName('purificar-flash');
    ok(flash?.visible && flash.material.opacity > 0, 'Clarão no núcleo: ' + target.join(','));
    api.advance(0.2);
    const ascendState = api.getState();
    ok(ascendState.phase === 'ascend', 'Ascensão após o brilho: ' + target.join(','));
    ok(ascendState.particleSystems.some(system => system.particles > 0), 'Vapor de luz sobe do núcleo: ' + target.join(','));
    const ring = ascendState.castStates[0].ring;
    ok(ring.visible && ring.opacity > 0, 'Anel ascendente visível: ' + target.join(','));
    const ringBefore = ascendState.castStates[0].ring;
    api.advance(0.25);
    const ringAfter = api.getState().castStates[0].ring;
    ok(ringAfter.position[1] > ringBefore.position[1] && ringAfter.scale > ringBefore.scale, 'Anel sobe e expande: ' + target.join(','));
    api.advance(1.4);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Dissipação total ao fim de 1,3 s: ' + target.join(','));
    ok(!api.scene.getObjectByName('purificar-motes'), 'Cena limpa após dissipação: ' + target.join(','));
    directions.push({ target, motes: ascendState.castStates[0].motes });
  }
  api.setTarget(3.7,1.05,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(1/60);
    paths.push(JSON.stringify(api.getState().castStates[0].motes));
    api.advance(1.6);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(paths).size === paths.length, 'Espiral única por disparo');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    api.setTarget(NaN, Infinity, 0);
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { PurificarVfxController } = await import('/src/presentation/effects/tkSkills/purificar/PurificarVfx.ts');
    const scene = new THREE.Scene();
    const controller = new PurificarVfxController(scene);
    controller.castPurificar(new THREE.Vector3(NaN,0,0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castPurificar(new THREE.Vector3(i + 1,0,0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três purificações simultâneas');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castPurificar(new THREE.Vector3(2,1,0));
      let elapsed = 0;
      let motesMoved = false;
      let previous = null;
      while (elapsed + 1/fps < 0.6 - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
        const snapshot = JSON.stringify(controller.getCastStates()[0]?.motes ?? []);
        if (previous !== null && snapshot !== previous) motesMoved = true;
        previous = snapshot;
      }
      while (elapsed < 1.35 - 1e-9) {
        const chunk = Math.min(0.1, 1.35 - elapsed);
        controller.update(chunk);
        elapsed += chunk;
      }
      ok(controller.getPhase() === 'idle', 'Dissipação completa em 1,3 s a ' + fps + ' fps');
      ok(motesMoved, 'Mons animados em passos fixos a ' + fps + ' fps');
      controller.clear();
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(3.7,1.05,0); api.cast(); api.advance(1/60);
  return { checks, directions, memory, skillId: 'tk_mag_7' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_mag_7" };
const targets = [[3.7,1.05,0],[-7.5,1.05,0],[-3.45,1.05,5],[-3.45,1.05,-4],
  [1.5,1.05,4],[1.5,1.05,-4],[-7,1.05,4],[-7,1.05,-4],
  [-3.45,4.5,0],[-3.45,0.9,0],[-3.45,1.12,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_PURIFICAR_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_PURIFICAR_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_PURIFICAR_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_PURIFICAR__.getState().target"), [-3.45, 4.5, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_PURIFICAR__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_PURIFICAR__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_PURIFICAR__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_PURIFICAR__;
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
const rotated = await evaluate("window.__UAIDZIN_TK_PURIFICAR__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_PURIFICAR__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_PURIFICAR__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["direção elevada", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-purificar-convergencia", "api.clear(); api.cast(); api.advance(0.18);"],
  ["tk-purificar-nucleo", "api.clear(); api.cast(); api.advance(0.4);"],
  ["tk-purificar-anel", "api.clear(); api.cast(); api.advance(0.75);"],
  ["tk-purificar-orbit", "api.clear(); api.cast(); api.advance(0.4); api.camera.position.set(-7,7,-10); api.camera.lookAt(0,1.4,0); api.render();"],
  ["tk-purificar-top", "api.clear(); api.cast(); api.advance(0.4); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_PURIFICAR__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_PURIFICAR__.renderer;
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
await fs.writeFile(path.join(output, "tk-purificar-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
