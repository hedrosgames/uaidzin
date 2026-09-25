import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_LUZ_URL ?? "http://127.0.0.1:5173/vfx/tk-luz.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_LUZ__)");
await evaluate(`window.__TK_LUZ_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_LUZ__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.05);
    const charge = api.getState();
    ok(charge.casts === 1 && charge.phase === 'charge', 'Carga em curso: ' + target.join(','));
    const glow = api.scene.getObjectByName('luz-charge-glow');
    ok(glow?.isMesh && glow.visible, 'Brilho de carga visível: ' + target.join(','));
    ok(charge.particleSystems.slice(0, 1).some(system => system.particles > 0), 'Partículas de carga na origem: ' + target.join(','));
    ok(charge.particleSystems.slice(1).every(system => system.particles === 0), 'Feixe e impacto aguardam carga: ' + target.join(','));
    api.advance(0.1);
    const fire = api.getState();
    ok(fire.phase === 'fire' && fire.castStates[0].phaseElapsed <= 0.001, 'Disparo após carga de 0,15 s: ' + target.join(','));
    const beam = api.scene.getObjectByName('luz-beam');
    const core = api.scene.getObjectByName('luz-core');
    ok(beam?.isMesh && beam.visible && core?.isMesh && core.visible, 'Feixe volumétrico com núcleo visível: ' + target.join(','));
    ok(Array.from(beam.instanceMatrix ?? beam.geometry.attributes.position.array).every(Number.isFinite), 'Geometria do feixe finita: ' + target.join(','));
    api.advance(fire.castStates[0].fireDuration + 1 / 60 + 1e-9);
    const impact = api.getState();
    ok(impact.phase === 'impact' && impact.castStates[0].head.every((value, index) =>
      Math.abs(value - impact.castStates[0].target[index]) < 1e-6), 'Impacto no destino: ' + target.join(','));
    ok(impact.castStates[0].lightIntensity > 4, 'Pico de luz no impacto: ' + target.join(','));
    ok(impact.particleSystems.slice(1, 3).every(system => system.particles > 0), 'Faíscas ao longo do feixe: ' + target.join(','));
    ok(impact.particleSystems.slice(-2).every(system => system.particles > 0), 'Estilhaços no impacto: ' + target.join(','));
    const flash = api.scene.getObjectByName('luz-flash');
    const ring = api.scene.getObjectByName('luz-shock-ring');
    ok(flash?.isMesh && flash.visible, 'Flash brilhante no fim: ' + target.join(','));
    ok(ring?.isMesh && ring.visible, 'Anel de choque no impacto: ' + target.join(','));
    directions.push({ target, head: impact.castStates[0].head, beamLength: impact.castStates[0].beamLength });
    api.advance(1);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup sem resíduo: ' + target.join(','));
  }
  api.setTarget(3.7, 0.9, 0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.05);
    paths.push(JSON.stringify(api.getState().castStates.map(state => state.beamLength)));
    api.advance(1.1);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    api.setTarget(NaN, Infinity, 0);
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { LuzVfxController } = await import('/src/presentation/effects/tkSkills/luz/LuzVfx.ts');
    const scene = new THREE.Scene();
    const controller = new LuzVfxController(scene);
    controller.castLuz(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(2, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castLuz(new THREE.Vector3(), new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três feixes concorrentes');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castLuz(new THREE.Vector3(), new THREE.Vector3(7, 1, 2));
      let elapsed = 0;
      while (elapsed + 1 / fps < 0.15 - 1e-9) {
        controller.update(1 / fps);
        elapsed += 1 / fps;
      }
      ok(controller.getPhase() === 'charge', 'Sem disparo antecipado a ' + fps + ' fps');
      controller.update(0.15 - elapsed);
      ok(controller.getPhase() === 'fire' && controller.getCastStates()[0].phaseElapsed <= 0.001,
        'Disparo em 0,15 s a ' + fps + ' fps');
      controller.clear();
    }
    controller.castLuz(new THREE.Vector3(), new THREE.Vector3(7, 1, 2));
    controller.update(1 / 60);
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(3.7, 0.9, 0); api.cast(); api.advance(0.05);
  return { checks, directions, memory, skillId: 'tk_mag_6' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_mag_6" };
const targets = [[3.7,0.9,0],[-7.5,0.9,0],[-3.45,0.9,5],[-3.45,0.9,-5],
  [1.5,0.9,4],[1.5,0.9,-4],[-7,0.9,4],[-7,0.9,-4],
  [-3.45,2.5,0],[-3.45,0.2,0],[-3.45,1.2,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_LUZ_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_LUZ_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12, "Ciclos de memória insuficientes: " + results.memory.length);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_LUZ_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_LUZ__.getState().target"), [-3.45, 2.5, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_LUZ__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_LUZ__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_LUZ__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_LUZ__;
  api.clear(); api.cast(); api.advance(0.2);
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
const rotated = await evaluate("window.__UAIDZIN_TK_LUZ__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_LUZ__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_LUZ__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["direção elevada", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-luz-charge", "api.clear(); api.cast(); api.advance(0.07);"],
  ["tk-luz-fire", "api.advance(0.1); api.advance(0.08);"],
  ["tk-luz-impact", "api.advance(0.4); api.advance(0.02);"],
  ["tk-luz-top", "api.clear(); api.cast(); api.advance(0.3); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_LUZ__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_LUZ__.renderer;
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
await fs.writeFile(path.join(output, "tk-luz-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
