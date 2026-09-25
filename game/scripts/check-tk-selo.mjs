import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_SELO_URL ?? "http://127.0.0.1:5173/vfx/tk-selo.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_SELO__)");
await evaluate(`window.__SELO_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_SELO__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const samples = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(1/60);
    const materialize = api.getState();
    ok(materialize.phase === 'materialize', 'Selo começa materializando: ' + target.join(','));
    ok(materialize.casts === 1, 'Um selo por cast: ' + target.join(','));
    const inner = api.scene.getObjectByName('selo-ring-inner');
    const outer = api.scene.getObjectByName('selo-ring-outer');
    ok(inner?.isMesh && inner.material.isMeshBasicMaterial, 'Anel interno é malha com textura de glifos: ' + target.join(','));
    ok(outer?.isMesh && outer.material.isMeshBasicMaterial, 'Anel externo é malha com textura de glifos: ' + target.join(','));
    ok(materialize.particleSystems.some(system => system.particles > 0), 'Poeira de luz ergue na materialização: ' + target.join(','));
    const seal = materialize.seals[0];
    ok(seal.rings.length === 2 && seal.rings.every(ring => ring.visible), 'Dois anéis visíveis: ' + target.join(','));
    ok(seal.rings.every(ring => ring.scale > 0.2 && ring.scale < 1.1), 'Anéis nascem pequenos e crescem: ' + target.join(','));
    ok(JSON.stringify(seal.position) === JSON.stringify(target.map((v, i) => i === 1 ? 0.02 : v)) ||
      Math.abs(seal.position[0] - target[0]) < 1e-6, 'Selo centrado no alvo: ' + target.join(','));
    api.advance(0.44);
    const closing = api.getState();
    ok(closing.seals[0].rings[0].opacity > 0.5, 'Anéis quase opacos ao fim da materialização: ' + target.join(','));
    api.advance(0.02);
    const closed = api.getState();
    ok(closed.phase === 'sealed', 'Selo fecha em ~0,45 s: ' + target.join(','));
    ok(closed.seals[0].flash.opacity > 0 && closed.seals[0].flash.visible, 'Flash central quente ao fechar: ' + target.join(','));
    ok(closed.particleSystems.some(system => system.particles > 0), 'Burst de fechamento emite partículas: ' + target.join(','));
    ok(closed.seals[0].lightIntensity > 3, 'Luz do flash acesa ao fechar: ' + target.join(','));
    api.advance(0.3);
    const sealed = api.getState();
    ok(sealed.phase === 'sealed', 'Selo selado permanece: ' + target.join(','));
    ok(sealed.seals[0].flash.opacity < 1 && (sealed.seals[0].flash.visible === false || sealed.seals[0].flash.opacity < closed.seals[0].flash.opacity),
      'Flash decai após o fechamento: ' + target.join(','));
    const rotationA = sealed.seals[0].rings.map(ring => ring.rotation);
    api.advance(0.5);
    const rotationB = api.getState().seals[0].rings.map(ring => ring.rotation);
    ok(rotationB[0] > rotationA[0], 'Anel interno gira em um sentido: ' + target.join(','));
    ok(rotationB[1] < rotationA[1], 'Anel externo gira no sentido oposto: ' + target.join(','));
    const sealActive = api.getState().seals[0];
    ok(sealActive.pulseTime > closed.seals[0].pulseTime, 'Tempo do pulso avança: ' + target.join(','));
    ok(api.getState().particleSystems.some(system => system.particles > 0), 'Partículas de glifo subindo no selo fechado: ' + target.join(','));
    samples.push({ target, closed, sealed });
    api.advance(1.5);
    const fading = api.getState();
    ok(fading.phase === 'fade', 'Fade no fim da duração: ' + target.join(','));
    api.advance(0.05);
    const fadeOpacityA = api.getState().seals[0].rings[0].opacity;
    ok(fadeOpacityA > 0 && fadeOpacityA < 0.92, 'Intensidade caindo no fade: ' + target.join(','));
    api.advance(0.2);
    const fadeOpacityB = api.getState().seals[0].rings[0].opacity;
    ok(fadeOpacityB < fadeOpacityA, 'Anéis desvanecem de fato: ' + target.join(','));
    api.advance(0.5);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Limpeza completa: ' + target.join(','));
    ok(!api.scene.getObjectByName('selo-ring-inner') && !api.scene.getObjectByName('selo-ring-outer'),
      'Anéis removidos da cena no fim: ' + target.join(','));
  }
  api.setTarget(0,0,0);
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.3);
    memory.push(api.getState().memory);
    api.advance(2.8);
    ok(api.getState().casts === 0, 'Selo encerra após ciclo ' + i);
  }
  if (repetitions > 0) {
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { SeloVfxController, DEFAULT_SELO_VFX_CONFIG } = await import('/src/presentation/effects/tkSkills/selo/SeloVfx.ts');
    ok(DEFAULT_SELO_VFX_CONFIG.sealDuration > 0 && DEFAULT_SELO_VFX_CONFIG.maxConcurrentCasts >= 1, 'Config padrão consistente');
    ok(DEFAULT_SELO_VFX_CONFIG.innerRadius > 0 && DEFAULT_SELO_VFX_CONFIG.outerRadius > DEFAULT_SELO_VFX_CONFIG.innerRadius, 'Raios concêntricos consistentes');
    const scene = new THREE.Scene();
    const controller = new SeloVfxController(scene, { activeDuration: 0.3, fadeDuration: 0.2 });
    controller.castSelo(new THREE.Vector3(NaN, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa centro inválido');
    controller.castSelo(new THREE.Vector3(), 0.3);
    ok(controller.getActiveCastCount() === 1 && controller.getPhase() === 'materialize', 'Duração custom respeitada');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (let i = 0; i < 5; i++) controller.castSelo(new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 2, 'Limite de dois selos concorrentes');
    controller.clear();
    const advanceController = (seconds) => {
      let remaining = seconds;
      while (remaining > 1e-9) {
        const stepSize = Math.min(remaining, 0.05);
        controller.update(stepSize);
        remaining -= stepSize;
      }
    };
    for (const fps of [30, 60, 144]) {
      controller.castSelo(new THREE.Vector3(), 0.3);
      let elapsed = 0;
      const step = 1 / fps;
      while (controller.getPhase() === 'materialize' && elapsed + step <= 0.45 + step) {
        controller.update(step);
        elapsed += step;
      }
      ok(controller.getPhase() === 'sealed', 'Fechamento completo em 0,45 s a ' + fps + ' fps');
      advanceController(0.3 + 1/60);
      ok(controller.getPhase() === 'fade', 'Fade após duração a ' + fps + ' fps');
      advanceController(0.25);
      ok(controller.getActiveCastCount() === 0, 'Selo descartado após fade a ' + fps + ' fps');
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0,0); api.cast(); api.advance(0.5);
  return { checks, samples, memory, skillId: 'tk_mag_2' };
}; true`);
const results = { checks: [], samples: [], memory: [], inputLimitations: [], skillId: "tk_mag_2" };
const targets = [[0,0,0],[-5.4,0,0],[0,0,4.5],[0,0,-4.5],[3.4,0,-3.4],[-3.4,0,3.4],
  [5.4,0,0],[-5.4,0,4.5],[2.5,0,2.5],[-2.5,0,-2.5],[6.5,0,-1.5]];
for (const target of targets) {
  const result = await evaluate(`window.__SELO_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.samples.push(...result.samples);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__SELO_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__SELO_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "2");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_SELO__.getState().target"), [0, 0, 4.5]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_SELO__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_SELO__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_SELO__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_SELO__;
  api.clear(); api.cast(); api.advance(0.5);
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
const rotated = await evaluate("window.__UAIDZIN_TK_SELO__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_SELO__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_SELO__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["posição do selo", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-selo-materialize", "api.clear(); api.cast(); api.advance(0.2);"],
  ["tk-selo-closed", "api.advance(0.3);"],
  ["tk-selo-sealed", "api.advance(0.6);"],
  ["tk-selo-top", "api.clear(); api.cast(); api.advance(0.6); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,0.5,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_SELO__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_SELO__.renderer;
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
await fs.writeFile(path.join(output, "tk-selo-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, samples: results.samples.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
