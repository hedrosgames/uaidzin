import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.FIRE_CHAIN_URL ?? "http://127.0.0.1:5173/vfx/fire-burst.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_FIRE_BURST__)");
await evaluate(`window.__FIRE_CHAIN_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_FIRE_BURST__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.10);
    const flight = api.getState();
    const volley = flight.chains[0];
    ok(flight.casts === 1 && volley.chains.length === 5, 'Cinco correntes por cast: ' + target.join(','));
    ok(flight.phase === 'flight' && volley.chains.every(chain => chain.visibleLinks > 0), 'Elos presentes em voo: ' + target.join(','));
    const chain = api.scene.getObjectByName('fire-burst-chain');
    ok(chain?.isInstancedMesh && chain.geometry.type === 'TorusGeometry', 'Elos são geometria 3D: ' + target.join(','));
    ok(Array.from(chain.instanceMatrix.array).every(Number.isFinite), 'Matrizes finitas: ' + target.join(','));
    const meshes = [];
    const tips = [];
    api.scene.traverse(object => {
      if (object.name === 'fire-burst-chain') meshes.push(object);
      if (object.name === 'fire-burst-tip') tips.push(object);
    });
    ok(meshes.length === 5 && meshes.every(mesh => mesh.isInstancedMesh &&
      Array.from(mesh.instanceMatrix.array).every(Number.isFinite)), 'Cinco malhas finitas: ' + target.join(','));
    ok(tips.length === 5 && tips.every(tip => tip.geometry.type === 'ConeGeometry'), 'Cinco pontas volumétricas: ' + target.join(','));
    ok(chain.material.emissiveIntensity < 0.1 && chain.material.metalness > 0.6, 'Metal escuro sem emissão excessiva: ' + target.join(','));
    if (target[0] === 3.7) {
      ok(new Set(volley.chains.map(chain => JSON.stringify(chain.controlPoints))).size === 5, 'Cinco trajetórias distintas');
      ok(volley.chains.every(chain => chain.length > 8.2), 'Curvas reais, maiores que o segmento direto');
      ok(volley.chains.every(chain => {
        const y = chain.controlPoints.map(p => p[1]);
        const z = chain.controlPoints.map(p => p[2]);
        return Math.max(...y) - Math.min(...y) > 0.8 && Math.max(...z) - Math.min(...z) > 0.8;
      }), 'Curvas ocupam altura e profundidade');
      ok(flight.particleSystems.slice(0,10).some(system => system.particles > 0), 'Fogo acompanha os elos');
      ok(flight.particleSystems.slice(-2).every(system => system.particles === 0), 'Sem explosão antes do contato');
    }
    api.advance(5/60);
    const lastFlight = api.getState();
    ok(lastFlight.phase === 'flight', 'Sem contato prematuro em 0,183 s: ' + target.join(','));
    ok(lastFlight.chains[0].chains.every((chain, index) =>
      JSON.stringify(chain.tipRotation) !== JSON.stringify(volley.chains[index].tipRotation)), 'Pontas giram em voo: ' + target.join(','));
    api.advance(1/60);
    const contact = api.getState();
    ok(contact.phase === 'impact', 'Contato em até 0,20 s: ' + target.join(','));
    const state = contact.chains[0];
    ok(state.elapsed === 0.2 && state.chains.every(chain =>
      Math.hypot(...chain.head.map((n,i) => n - state.target[i])) < 1e-6), 'Cinco pontas no alvo juntas em 0,20 s: ' + target.join(','));
    ok(contact.particleSystems.slice(-2).every(system => system.particles > 0), 'Explosão Quarks no contato: ' + target.join(','));
    directions.push({ target, contact: state.chains.map(chain => chain.head), visibleLinks: volley.chains.map(chain => chain.visibleLinks) });
    api.advance(1);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
  }
  api.setTarget(3.7,1.05,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.10);
    paths.push(JSON.stringify(api.getState().chains[0].chains.map(chain => chain.controlPoints)));
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
  const { FireBurstVfxController } = await import('/src/presentation/effects/fireBurst/FireBurstVfx.ts');
  const scene = new THREE.Scene();
  const controller = new FireBurstVfxController(scene);
  controller.castFireBurst(new THREE.Vector3(NaN,0,0), new THREE.Vector3(2,0,0));
  ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
  for (let i = 0; i < 8; i++) controller.castFireBurst(new THREE.Vector3(), new THREE.Vector3(i + 1,0,0));
  ok(controller.getActiveCastCount() === 3 && controller.getSystems().length === 36, 'Limite de três salvas, quinze correntes');
  controller.clear();
  ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
  for (const fps of [30, 60, 144]) {
    controller.castFireBurst(new THREE.Vector3(), new THREE.Vector3(7,1,2));
    let elapsed = 0;
    while (elapsed + 1/fps < 0.2 - 1e-9) {
      controller.update(1/fps);
      elapsed += 1/fps;
    }
    ok(controller.getPhase() === 'flight', 'Sem impacto antecipado a ' + fps + ' fps');
    controller.update(0.2 - elapsed);
    ok(controller.getPhase() === 'impact' && controller.getCastStates()[0].elapsed === 0.2,
      'Chegada em 0,20 s a ' + fps + ' fps');
    const flameSystems = controller.getSystems().filter(system => system.material.map?.name === 'fire-burst-flame-atlas');
    ok(flameSystems.length === 7 && flameSystems.every(system =>
      system.uTileCount === 4 && system.vTileCount === 4 && system.material.map.image.width === 512),
      'Atlas animado em cinco rastros e dois emissores de impacto a ' + fps + ' fps');
    controller.clear();
  }
  controller.dispose(); controller.dispose();
  ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  const { EffectManager } = await import('/src/presentation/effects/EffectManager.ts');
  const { getSkillVfxProfile } = await import('/src/presentation/effects/skill/SkillVfxCatalog.ts');
  const host = document.createElement('div');
  const runtimeScene = new THREE.Scene();
  const effects = new EffectManager(host, runtimeScene);
  const profile = getSkillVfxProfile('tk_fis_fire_burst');
  try {
    effects.dispatchSkillVfx({profile,origin:new THREE.Vector3(),target:new THREE.Vector3(3,0,2),
      center:new THREE.Vector3(),colorHex:profile.colorHex,facing:0,range:profile.range,
      radius:profile.radius,hits:[],hasHeal:false,hasBuff:false,hasTransform:false,hasSummon:false});
    effects.update(0.10, api.camera, 1600, 900);
    ok(effects.getSkillVfxState().active === 1, 'Fire Burst real despacha uma salva');
    let runtimeChains = 0;
    runtimeScene.traverse(object => { if (object.name === 'fire-burst-chain') runtimeChains++; });
    ok(runtimeChains === 5, 'Runtime despacha cinco correntes por skill');
    ok(runtimeScene.getObjectByName('fire-burst-chain')?.isInstancedMesh, 'Runtime usa elos 3D, não spritesheet');
    effects.clearSkillVfx();
    ok(effects.getSkillVfxState().active === 0, 'Saída de cena limpa corrente do runtime');
  } finally { effects.dispose(); }
  }
  api.setTarget(3.7,1.05,0); api.cast(); api.advance(0.10);
  return { checks, directions, memory, skillId: 'tk_fis_fire_burst' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_fis_fire_burst" };
const targets = [[3.7,1.05,0],[-7.5,1.05,0],[-3.45,1.05,5],[-3.45,1.05,-5],
  [1.5,1.05,4],[1.5,1.05,-4],[-7,1.05,4],[-7,1.05,-4],
  [-3.45,4.5,0],[-3.45,0.9,0],[-3.45,1.12,0]];
for (const target of targets) {
  const result = await evaluate(`window.__FIRE_CHAIN_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__FIRE_CHAIN_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__FIRE_CHAIN_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 80);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_FIRE_BURST__.getState().target"), [-3.45, 4.5, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_FIRE_BURST__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_FIRE_BURST__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_FIRE_BURST__.getState().speed"), 0.25);
const orbit = await evaluate(`(() => {
  const api = window.__UAIDZIN_FIRE_BURST__;
  api.clear(); api.cast(); api.advance(0.15);
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
const rotated = await evaluate("window.__UAIDZIN_FIRE_BURST__.camera.position.toArray()");
const nativeOrbit = Math.hypot(...rotated.map((value, index) => value - orbit.camera[index])) > 0.1;
if (!nativeOrbit) {
  results.inputLimitations.push("CDP não entregou arrasto nativo; órbita validada com PointerEvents sintéticos.");
  await evaluate(`(() => {
    const canvas = window.__UAIDZIN_FIRE_BURST__.renderer.domElement;
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
  const syntheticOrbit = await evaluate("window.__UAIDZIN_FIRE_BURST__.camera.position.toArray()");
  assert(Math.hypot(...syntheticOrbit.map((value, index) => value - orbit.camera[index])) > 0.1);
}
await evaluate("document.getElementById('reset-camera').click()");
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
results.controls = ["direção elevada", "pausa", "velocidade", nativeOrbit ? "órbita por mouse" : "órbita por PointerEvents sintéticos", "restaurar câmera"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["fire-chain-flight", "api.clear(); api.cast(); api.advance(0.15);"],
  ["fire-chain-impact", "api.advance(0.09);"],
  ["fire-chain-orbit", "api.clear(); api.cast(); api.advance(0.15); api.camera.position.set(-7,7,-10); api.camera.lookAt(0,1.4,0); api.render();"],
  ["fire-chain-top", "api.clear(); api.cast(); api.advance(0.18); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_FIRE_BURST__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_FIRE_BURST__.renderer;
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
await fs.writeFile(path.join(output, "fire-chain-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
