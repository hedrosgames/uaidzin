import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_POSTURA_URL ?? "http://127.0.0.1:5173/vfx/tk-postura.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_POSTURA__)");
await evaluate(`window.__POSTURA_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_POSTURA__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const samples = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast(2);
    api.advance(1/60);
    const activation = api.getState();
    ok(activation.phase === 'activation', 'Postura entra em ativação: ' + target.join(','));
    ok(activation.casts === 1, 'Uma postura por cast: ' + target.join(','));
    const ring = api.scene.getObjectByName('tk-postura-ground-ring');
    ok(ring?.isMesh && ring.material.isShaderMaterial, 'Anel de chão é malha com shader: ' + target.join(','));
    ok(Boolean(api.scene.getObjectByName('tk-postura-closure-ring-0')), 'Primeiro anel de fechamento presente: ' + target.join(','));
    ok(Boolean(api.scene.getObjectByName('tk-postura-closure-ring-1')), 'Segundo anel de fechamento presente: ' + target.join(','));
    ok(activation.stances[0].closure[0].scale > activation.stances[0].closure[1].scale, 'Anéis duplos em raios distintos: ' + target.join(','));
    ok(activation.stances[0].closure[0].opacity > 0, 'Anel externo visível no fechamento: ' + target.join(','));
    ok(activation.stances[0].lightIntensity > 0 && activation.stances[0].lightIntensity < 3,
      'Luz do firmamento é tenue: ' + target.join(','));
    ok(Math.abs(activation.stances[0].position[0] - target[0]) < 1e-6, 'Postura centrada no alvo: ' + target.join(','));
    api.advance(0.35);
    const active = api.getState();
    ok(active.phase === 'active', 'Postura firmada após ativação: ' + target.join(','));
    const breathA = active.stances[0];
    ok([0, 1].every(index => api.scene.getObjectByName('tk-postura-closure-ring-' + index)?.visible === false), 'Anéis de fechamento somem após firmar: ' + target.join(','));
    ok(breathA.ring.opacity > 0.5 && breathA.ring.opacity < 1, 'Anel firmado com intensidade estável: ' + target.join(','));
    api.advance(0.25);
    const breathB = api.getState().stances[0];
    ok(breathB.breathTime > breathA.breathTime, 'Tempo de respiração avança: ' + target.join(','));
    ok(Math.abs(breathB.ring.opacity - breathA.ring.opacity) > 1e-4, 'Anel respira na intensidade: ' + target.join(','));
    ok(Math.abs(breathB.lightIntensity - breathA.lightIntensity) > 1e-4, 'Luz respira devagar: ' + target.join(','));
    const ringActive = api.scene.getObjectByName('tk-postura-ground-ring');
    const timeA = ringActive.material.uniforms.uTime.value;
    api.advance(2/60);
    const timeB = ringActive.material.uniforms.uTime.value;
    ok(timeB > timeA, 'Uniform uTime do shader avança: ' + target.join(','));
    api.advance(1.6);
    const resisted = api.getState().stances[0];
    ok(resisted.resists >= 1, 'Faíscas de resistência disparam no intervalo: ' + target.join(','));
    ok(api.getState().particleSystems.some(system => system.particles > 0) || api.getState().particles === 0,
      'Sistemas de partícula sem estado inválido: ' + target.join(','));
    samples.push({ target, breathA, breathB, resisted });
    api.advance(0.15);
    const fading = api.getState();
    ok(fading.phase === 'fade', 'Fade no fim da duração: ' + target.join(','));
    api.advance(0.05);
    const fadeOpacityA = api.getState().stances[0].ring.opacity;
    ok(fadeOpacityA > 0 && fadeOpacityA < 1, 'Intensidade caindo no fade: ' + target.join(','));
    api.advance(0.2);
    const fadeOpacityB = api.getState().stances[0].ring.opacity;
    ok(fadeOpacityB < fadeOpacityA, 'Anel desvanece de fato: ' + target.join(','));
    api.advance(1.2);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Limpeza completa: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-postura-ground-ring'), 'Anel removido da cena no fim: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-postura-closure-ring-0'), 'Anéis de fechamento removidos no fim: ' + target.join(','));
  }
  api.setTarget(0,0,0);
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast(2);
    api.advance(0.3);
    memory.push(api.getState().memory);
    api.advance(3.2);
    ok(api.getState().casts === 0, 'Postura encerra após ciclo ' + i);
  }
  if (repetitions > 0) {
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { PosturaVfxController, DEFAULT_POSTURA_VFX_CONFIG } = await import('/src/presentation/effects/tkSkills/postura/PosturaVfx.ts');
    ok(DEFAULT_POSTURA_VFX_CONFIG.duration > 0 && DEFAULT_POSTURA_VFX_CONFIG.maxConcurrentCasts >= 1, 'Config padrão consistente');
    ok(Math.abs(DEFAULT_POSTURA_VFX_CONFIG.activationDuration - 0.3) < 1e-6, 'Ativação padrão em ~0,3 s');
    const scene = new THREE.Scene();
    const controller = new PosturaVfxController(scene, { duration: 0.4, fadeDuration: 0.2 });
    controller.castPostura(new THREE.Vector3(NaN, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa centro inválido');
    controller.castPostura(new THREE.Vector3(), 0.4);
    ok(controller.getActiveCastCount() === 1 && controller.getPhase() === 'activation', 'Duração custom respeitada');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (let i = 0; i < 5; i++) controller.castPostura(new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 2, 'Limite de duas posturas concorrentes');
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
      controller.castPostura(new THREE.Vector3(), 0.4);
      let elapsed = 0;
      const step = 1 / fps;
      while (elapsed + step <= 0.3 + 1e-9) {
        controller.update(step);
        elapsed += step;
      }
      let guard = 0;
      while (controller.getPhase() === 'activation' && guard < 3) {
        controller.update(1 / 60);
        guard += 1;
      }
      ok(controller.getPhase() === 'active', 'Ativação completa em 0,3 s a ' + fps + ' fps');
      advanceController(0.4 + 1/60);
      ok(controller.getPhase() === 'fade', 'Fade após duração a ' + fps + ' fps');
      advanceController(0.25);
      ok(controller.getActiveCastCount() === 0, 'Postura descartada após fade a ' + fps + ' fps');
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0,0); api.cast(2); api.advance(0.3);
  return { checks, samples, memory, skillId: 'tk_ctrl_2' };
}; true`);
const results = { checks: [], samples: [], memory: [], inputLimitations: [], skillId: "tk_ctrl_2" };
const targets = [[0,0,0],[-5.4,0,0],[0,0,4.5],[0,0,-4.5],
  [3.4,0,-3.4],[-3.4,0,3.4],[5.4,0,0],[2.5,0,2.5],
  [-2.5,0,-2.5],[6.2,0,-1.8],[-1.4,0,5.9]];
for (const target of targets) {
  const result = await evaluate(`window.__POSTURA_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.samples.push(...result.samples);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__POSTURA_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12);
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__POSTURA_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "2");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_POSTURA__.getState().target"), [0, 0, 4.5]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_POSTURA__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_POSTURA__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_POSTURA__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_TK_POSTURA__;
  api.clear(); api.cast(2); api.advance(0.3);
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
const rotated = await evaluate("window.__UAIDZIN_TK_POSTURA__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_TK_POSTURA__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_TK_POSTURA__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["posição da postura", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-postura-activation", "api.clear(); api.cast(2); api.advance(1/60);"],
  ["tk-postura-active", "api.advance(0.6);"],
  ["tk-postura-resist", "api.advance(1.8);"],
  ["tk-postura-fade", "api.advance(2.6);"],
  ["tk-postura-top", "api.clear(); api.cast(2); api.advance(0.6); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,0.5,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_POSTURA__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_POSTURA__.renderer;
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
await fs.writeFile(path.join(output, "tk-postura-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, samples: results.samples.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
