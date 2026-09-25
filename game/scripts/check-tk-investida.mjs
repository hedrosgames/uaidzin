import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_INVESTIDA_URL ?? "http://127.0.0.1:5173/vfx/tk-investida.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_INVESTIDA__)");
await evaluate(`window.__TK_INVESTIDA_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_INVESTIDA__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.05);
    const dash = api.getState();
    const linkState = dash.castStates[0].links;
    ok(dash.casts === 1 && dash.phase === 'dash', 'Investida em curso: ' + target.join(','));
    const link = api.scene.getObjectByName('investida-link');
    ok(link?.isInstancedMesh && link.geometry.type === 'TorusGeometry' &&
      Array.from(link.instanceMatrix.array).every(Number.isFinite), 'Elos são geometria 3D finita: ' + target.join(','));
    const tips = [];
    api.scene.traverse(object => { if (object.name === 'investida-tip') tips.push(object); });
    ok(tips.length === 1 && tips[0].geometry.type === 'ConeGeometry', 'Ponta volumétrica no deslocamento: ' + target.join(','));
    ok(linkState.visibleLinks > 0 && linkState.length > 0, 'Trilha percorre o caminho: ' + target.join(','));
    ok(dash.particleSystems.some(system => system.particles > 0), 'Vento acompanha a investida: ' + target.join(','));
    ok(dash.particleSystems.slice(-2).every(system => system.particles === 0), 'Sem poeira antes da chegada: ' + target.join(','));
    api.advance(0.1);
    const arrival = api.getState();
    ok(arrival.phase === 'arrival' && arrival.castStates[0].elapsed === 0.15, 'Chegada em 0,15 s: ' + target.join(','));
    ok(arrival.castStates[0].links.head.every((value, index) =>
      Math.abs(value - arrival.castStates[0].target[index]) < 1e-6), 'Ponta no destino em 0,15 s: ' + target.join(','));
    ok(arrival.particleSystems.slice(-2).every(system => system.particles > 0), 'Poeira no destino: ' + target.join(','));
    const ring = api.scene.getObjectByName('investida-ring');
    ok(ring?.isMesh && ring.visible, 'Anel de poeira visível na chegada: ' + target.join(','));
    directions.push({ target, head: arrival.castStates[0].links.head, visibleLinks: linkState.visibleLinks });
    api.advance(1);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup sem resíduo: ' + target.join(','));
  }
  api.setTarget(3.7, 0.35, 0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.05);
    paths.push(JSON.stringify(api.getState().castStates.map(state => state.links.controlPoints)));
    api.advance(1.1);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(paths).size === paths.length, 'Trajetórias diferentes entre disparos');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    api.setTarget(NaN, Infinity, 0);
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { InvestidaVfxController } = await import('/src/presentation/effects/tkSkills/investida/InvestidaVfx.ts');
    const scene = new THREE.Scene();
    const controller = new InvestidaVfxController(scene);
    controller.castInvestida(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(2, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castInvestida(new THREE.Vector3(), new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três investidas concorrentes');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castInvestida(new THREE.Vector3(), new THREE.Vector3(7, 1, 2));
      let elapsed = 0;
      while (elapsed + 1 / fps < 0.15 - 1e-9) {
        controller.update(1 / fps);
        elapsed += 1 / fps;
      }
      ok(controller.getPhase() === 'dash', 'Sem chegada antecipada a ' + fps + ' fps');
      controller.update(0.15 - elapsed);
      ok(controller.getPhase() === 'arrival' && controller.getCastStates()[0].elapsed === 0.15,
        'Chegada em 0,15 s a ' + fps + ' fps');
      controller.clear();
    }
    controller.castInvestida(new THREE.Vector3(), new THREE.Vector3(7, 1, 2));
    controller.update(1 / 60);
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(3.7, 0.35, 0); api.cast(); api.advance(0.05);
  return { checks, directions, memory, skillId: 'tk_fis_3' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_fis_3" };
const targets = [[3.7,0.35,0],[-7.5,0.35,0],[-3.45,0.35,5],[-3.45,0.35,-5],
  [1.5,0.35,4],[1.5,0.35,-4],[-7,0.35,4],[-7,0.35,-4],
  [-3.45,2.5,0],[-3.45,0.2,0],[-3.45,1.0,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_INVESTIDA_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_INVESTIDA_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_INVESTIDA_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_INVESTIDA__.getState().target"), [-3.45, 2.5, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_INVESTIDA__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_INVESTIDA__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_INVESTIDA__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_INVESTIDA__;
  api.clear(); api.cast(); api.advance(0.07);
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
const rotated = await evaluate("window.__UAIDZIN_TK_INVESTIDA__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_INVESTIDA__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_INVESTIDA__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["direção elevada", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-investida-dash", "api.clear(); api.cast(); api.advance(0.07);"],
  ["tk-investida-arrival", "api.advance(0.08); api.advance(0.02);"],
  ["tk-investida-top", "api.clear(); api.cast(); api.advance(0.09); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_INVESTIDA__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_INVESTIDA__.renderer;
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
await fs.writeFile(path.join(output, "tk-investida-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
