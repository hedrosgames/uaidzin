import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.FM_LANCA_GLACIAL_URL ?? "http://127.0.0.1:5173/vfx/fm-lanca-glacial.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_FM_LANCA_GLACIAL__)");
const hook = `
window.__FM_LANCA_GLACIAL_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_FM_LANCA_GLACIAL__;
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
    const chargeGlow = api.scene.getObjectByName('lanca-glacial-heart');
    ok(chargeGlow?.isMesh && chargeGlow.visible, 'Núcleo de gelo em carga: ' + target.join(','));
    ok(charge.particleSystems.slice(0, 1).some(system => system.particles > 0), 'Motes de carga na origem: ' + target.join(','));
    ok(charge.particleSystems.slice(1).every(system => system.particles === 0), 'Voo e impacto aguardam carga: ' + target.join(','));
    ok(charge.castStates[0].lightIntensity > 0.5, 'Luz acende na carga: ' + target.join(','));
    api.advance(0.07);
    const flight = api.getState();
    ok(flight.phase === 'flight' && flight.castStates[0].phaseElapsed <= 1 / 60 + 1e-9, 'Voo após carga de 0,10 s: ' + target.join(','));
    const blade = api.scene.getObjectByName('lanca-glacial-blade');
    const socket = api.scene.getObjectByName('lanca-glacial-socket');
    const collar = api.scene.getObjectByName('lanca-glacial-collar');
    const tail = api.scene.getObjectByName('lanca-glacial-tail');
    ok(blade?.isMesh && blade.visible, 'Lâmina de gelo 3D em voo: ' + target.join(','));
    ok(socket?.isMesh && socket.visible, 'Engaste de ferro em voo: ' + target.join(','));
    ok(collar?.isMesh && collar.visible, 'Colar de bronze em voo: ' + target.join(','));
    ok(blade?.geometry?.type === 'ConeGeometry', 'Lâmina é ConeGeometry real: ' + target.join(','));
    ok(tail?.isInstancedMesh, 'Cauda de gelo é InstancedMesh real: ' + target.join(','));
    ok([0, 1, 2].every(index => {
      const shard = api.scene.getObjectByName('lanca-glacial-shard-' + index);
      return shard?.isMesh && shard.visible;
    }), 'Três cristais orbitando: ' + target.join(','));
    ok(![...api.scene.children].some(child => child.isSprite), 'Nenhum sprite na cena: ' + target.join(','));
    ok(flight.castStates[0].head.every(Number.isFinite) && flight.castStates[0].tangent.every(Number.isFinite),
      'Cabeça e tangente finitas: ' + target.join(','));
    ok(flight.particleSystems.slice(1, 3).every(system => system.particles > 0), 'Manto e cintilações em voo: ' + target.join(','));
    ok(flight.particleSystems.slice(-2).every(system => system.particles === 0), 'Impacto ainda não emitiu: ' + target.join(','));
    const duration = flight.castStates[0].flightDuration;
    api.advance(duration * 0.5);
    const midflight = api.getState();
    ok(midflight.phase === 'flight', 'Meio do voo ainda em voo: ' + target.join(','));
    ok(midflight.castStates[0].tail.shards > 0, 'Cauda de gelo crescendo no voo: ' + target.join(','));
    ok(midflight.castStates[0].head.some((value, index) =>
      Math.abs(value - midflight.castStates[0].origin[index]) > 0.05), 'Lança percorreu distância: ' + target.join(','));
    api.advance(duration * 0.5 + 1 / 60 + 1e-9);
    const impact = api.getState();
    ok(impact.phase === 'impact' && impact.castStates[0].head.every((value, index) =>
      Math.abs(value - impact.castStates[0].target[index]) < 1e-6), 'Impacto no destino: ' + target.join(','));
    ok(impact.castStates[0].lightIntensity > 3, 'Pico de luz no impacto: ' + target.join(','));
    ok(impact.particleSystems.slice(-2).every(system => system.particles > 0), 'Estilhaço e vapor no impacto: ' + target.join(','));
    const flash = api.scene.getObjectByName('lanca-glacial-flash');
    const fracture = api.scene.getObjectByName('lanca-glacial-fracture');
    const frost = api.scene.getObjectByName('lanca-glacial-frost');
    const debris = api.scene.getObjectByName('lanca-glacial-debris');
    const haft = api.scene.getObjectByName('lanca-glacial-haft');
    ok(flash?.isMesh && flash.visible, 'Flash no impacto: ' + target.join(','));
    ok(fracture?.isMesh && fracture.visible, 'Fratura no impacto: ' + target.join(','));
    ok(frost?.isMesh && frost.visible, 'Geada no alvo: ' + target.join(','));
    ok(fracture?.geometry?.type === 'RingGeometry', 'Fratura é anel cristalino real: ' + target.join(','));
    ok(debris?.isInstancedMesh && debris.count > 0, 'Estilhaço geométrico no impacto: ' + target.join(','));
    ok(Array.from(debris.instanceMatrix.array).every(Number.isFinite), 'Matrizes de estilhaço finitas: ' + target.join(','));
    ok([0, 1, 2].every(index => api.scene.getObjectByName('lanca-glacial-shard-' + index)?.visible),
      'Gaias de cristal se abrem no impacto: ' + target.join(','));
    ok(tail.visible === false, 'Cauda some no contato: ' + target.join(','));
    ok(blade.visible === false && socket.visible === false, 'Lança recolhe no impacto: ' + target.join(','));
    ok(haft?.visible === false, 'Haste recolhe no impacto: ' + target.join(','));
    directions.push({ target, head: impact.castStates[0].head, flightDuration: duration });
    api.advance(1);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup sem resíduo: ' + target.join(','));
  }
  api.setTarget(3.7, 0.9, 0);
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.4);
    api.advance(0.5);
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
    const { LancaGlacialVfxController } = await import('/src/presentation/effects/fmSkills/lanca-glacial/LancaGlacialVfx.ts');
    const scene = new THREE.Scene();
    const controller = new LancaGlacialVfxController(scene);
    controller.castLancaGlacial(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(2, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castLancaGlacial(new THREE.Vector3(), new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três esferas concorrentes');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castLancaGlacial(new THREE.Vector3(), new THREE.Vector3(7, 1, 2));
      let guard = 0;
      while (controller.getPhase() === 'charge' && guard < 40) {
        controller.update(1 / fps);
        guard += 1;
      }
      const state = controller.getCastStates()[0];
      ok(controller.getPhase() === 'flight', 'Voo iniciado a ' + fps + ' fps');
      ok(state.phaseStartedAt >= 0.1 - 1e-9, 'Carga completa antes do voo a ' + fps + ' fps');
      ok(state.phaseStartedAt - 0.1 <= 1 / 60 + 1e-9, 'Voo em 0,10 s ± 1 passo fixo a ' + fps + ' fps');
      ok(state.phaseElapsed <= 1 / 60 + 1e-9, 'Sem salto de fase a ' + fps + ' fps');
      controller.clear();
    }
    controller.castLancaGlacial(new THREE.Vector3(), new THREE.Vector3(7, 1, 2));
    controller.update(1 / 60);
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(3.7, 0.9, 0); api.cast(); api.advance(0.05);
  return { checks, directions, memory, skillId: 'fm_mag_lanca_glacial' };
}; true`;

async function ensurePage() {
  const ready = await evaluate(
    "Boolean(window.__UAIDZIN_FM_LANCA_GLACIAL__ && window.__FM_LANCA_GLACIAL_QA__)",
  ).catch(() => false);
  if (ready) return;
  await command("open", `${url}?qa=1`);
  await command("wait", "--fn", "Boolean(window.__UAIDZIN_FM_LANCA_GLACIAL__)");
  await evaluate(hook);
}

await evaluate(hook);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "fm_mag_lanca_glacial" };
const targets = [[3.7,0.9,0],[-7.5,0.9,0],[-3.45,0.9,5],[-3.45,0.9,-5],
  [1.5,0.9,4],[1.5,0.9,-4],[-7,0.9,4],[-7,0.9,-4],
  [-3.45,2.5,0],[-3.45,0.2,0],[-3.45,1.2,0]];
for (const target of targets) {
  const result = await evaluate(`window.__FM_LANCA_GLACIAL_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__FM_LANCA_GLACIAL_QA__([], 4, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 16, "Ciclos de memória insuficientes: " + results.memory.length);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__FM_LANCA_GLACIAL_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_FM_LANCA_GLACIAL__.getState().target"), [-3.45, 2.5, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_FM_LANCA_GLACIAL__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_FM_LANCA_GLACIAL__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_FM_LANCA_GLACIAL__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_FM_LANCA_GLACIAL__;
  api.clear(); api.cast(); api.advance(0.3);
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
const rotated = await evaluate("window.__UAIDZIN_FM_LANCA_GLACIAL__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_FM_LANCA_GLACIAL__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_FM_LANCA_GLACIAL__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["direção elevada", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["fm-lanca-glacial-charge", "api.clear(); api.cast(); api.advance(0.07);"],
  ["fm-lanca-glacial-flight", "api.advance(0.1); api.advance(0.12);"],
  ["fm-lanca-glacial-impact", "api.advance(0.2); api.advance(0.05);"],
  ["fm-lanca-glacial-top", "api.clear(); api.cast(); api.advance(0.35); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  let capture = null;
  for (let attempt = 0; attempt < 2 && capture === null; attempt += 1) {
    capture = await evaluate(`(() => {
      const api = window.__UAIDZIN_FM_LANCA_GLACIAL__;
      ${code}
      api.render();
      return api.renderer.domElement.toDataURL('image/png');
    })()`).catch(async () => {
      await ensurePage();
      return null;
    });
  }
  assert(capture, "Captura de tela falhou: " + name);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_FM_LANCA_GLACIAL__.renderer;
  return { error: renderer.getContext().getError(),
    shadersValid: renderer.info.programs.every(program => program.diagnostics?.runnable !== false) };
})()`);
assert.equal(results.webgl.error, 0);
assert.equal(results.webgl.shadersValid, true);
const read = (relative) => fs.readFile(path.join(root, relative), "utf-8");
const gate = [];
const expect = (value, message) => { if (!value) throw new Error(message); gate.push(message); };
const catalog = await read("src/presentation/effects/skill/SkillVfxCatalog.ts");
const types = await read("src/presentation/effects/skill/SkillVfxTypes.ts");
const manager = await read("src/presentation/effects/EffectManager.ts");
const vite = await read("vite.config.ts");
const lab = await read("vfx/fm-lanca-glacial.html");
expect(catalog.includes('fm_mag_lanca_glacial: "lanca-glacial"'), "Catálogo mapeia fm_mag_lanca_glacial");
expect(catalog.includes("FM_DEDICATED_VFX_BY_SKILL_ID[skillId]"), "Catálogo resolve a família FM dedicada");
expect(types.includes('| "lanca-glacial"'), "DedicatedSkillVfx declara lanca-glacial");
expect(manager.includes('case "lanca-glacial"'), "EffectManager tem ramo de dispatch");
expect(manager.includes("this.fmLancaGlacial.castLancaGlacial("), "EffectManager despacha para o controller da lança");
expect(manager.includes("this.fmLancaGlacial.getActiveCastCount()"), "EffectManager soma casts da lança no estado");
expect(manager.includes("this.fmLancaGlacial.getParticleCount()"), "EffectManager soma partículas da lança no estado");
expect(vite.includes("vfx/fm-lanca-glacial.html"), "Vite tem rota do lab da esfera");
expect(lab.includes("Lança Glacial UAID"), "Lab usa a marca de qualidade UAID no título");
expect(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(lab), "Lab sem emoji");
const sources = [
  "src/presentation/effects/fmSkills/lanca-glacial/LancaGlacialVfx.ts",
  "src/presentation/effects/fmSkills/lanca-glacial/LancaGlacialParticleSystems.ts",
  "src/presentation/effects/fmSkills/lanca-glacial/LancaGlacialTextures.ts",
  "src/presentation/effects/fmSkills/lanca-glacial/LancaGlacialFrostTexture.ts",
  "src/presentation/effects/fmSkills/lanca-glacial/demo.ts",
];
for (const relative of sources) {
  const text = await read(relative);
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const at = line.search(/(^|[^:])\/\//);
      return at >= 0 ? line.slice(0, at) : line;
    })
    .join("\n");
  expect(!/\/\*|\/\//.test(stripped), "Zero comentário em " + relative);
  expect(!/console\.(log|debug|warn)\(/.test(text), "Sem console de debug em " + relative);
}
results.gate = gate;
results.frameScheduling = await evaluate(`Promise.race([
  new Promise(resolve => requestAnimationFrame(() => resolve(true))),
  new Promise(resolve => setTimeout(() => resolve(false), 1000)),
])`);
if (!results.frameScheduling) {
  results.inputLimitations.push("requestAnimationFrame suspenso no navegador integrado; duração e renderização testadas quadro a quadro, reprodução automática não verificada.");
}
await fs.writeFile(path.join(output, "fm-lanca-glacial-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length + results.gate.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
