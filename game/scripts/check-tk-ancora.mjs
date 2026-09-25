import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_ANCORA_URL ?? "http://127.0.0.1:5173/vfx/tk-ancora.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_ANCORA__)");
await evaluate(`window.__TK_ANCORA_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_ANCORA__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.08);
    const casting = api.getState();
    const cast = casting.ancoras[0];
    ok(casting.casts === 1, 'Uma âncora por cast: ' + target.join(','));
    ok(casting.phase === 'chain', 'Fase de corrente após cast: ' + target.join(','));
    ok(cast.chain.visibleLinks > 0, 'Corrente espectral com elos visíveis: ' + target.join(','));
    ok(cast.chain.length > 0.5, 'Corrente estica do caster ao alvo: ' + target.join(','));
    const chainMesh = api.scene.getObjectByName('tk-ancora-chain');
    ok(chainMesh?.isObject3D, 'InstancedMesh da corrente na cena: ' + target.join(','));
    chainMesh.traverse(object => {
      if (object.isMesh) ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite),
        'Geometria finita: ' + target.join(','));
    });
    const firstHead = cast.chain.head;
    api.advance(0.1);
    const stretched = api.getState().ancoras[0];
    ok(stretched.chain.head[0] !== firstHead[0] || stretched.chain.head[1] !== firstHead[1],
      'Ponta da corrente avança entre quadros: ' + target.join(','));
    ok(!cast.anchorVisible, 'Âncora ainda no céu durante a corrente: ' + target.join(','));
    api.advance(0.2);
    api.advance(1/30);
    const dropping = api.getState();
    ok(dropping.phase === 'fall' && dropping.ancoras[0].anchorVisible, 'Âncora cai após a corrente: ' + target.join(','));
    ok(dropping.ancoras[0].anchorDrop > 0 && dropping.ancoras[0].anchorDrop < 1, 'Queda em progresso: ' + target.join(','));
    api.advance(0.3);
    const impact = api.getState();
    ok(impact.phase === 'impact', 'Impacto em até 0,3 s de queda: ' + target.join(','));
    ok(impact.ancoras[0].planted, 'Âncora cravada no alvo: ' + target.join(','));
    ok(impact.particleSystems.some(system => system.particles > 0), 'Faíscas e estilhaços no impacto: ' + target.join(','));
    const shock = api.scene.getObjectByName('tk-ancora-shock');
    ok(shock?.isMesh && shock.material.opacity > 0, 'Anel de choque vermelho-brasa no chão: ' + target.join(','));
    const flash = api.scene.getObjectByName('tk-ancora-flash');
    ok(flash?.isMesh && flash.visible, 'Flash de impacto: ' + target.join(','));
    const light = api.scene.children.flatMap(object => object.isPointLight ? [object] :
      object.children?.filter(child => child.isPointLight) ?? []);
    ok(light.some(point => point.intensity > 3), 'PointLight forte no impacto: ' + target.join(','));
    api.advance(0.45);
    const planted = api.getState().ancoras[0];
    ok(planted.anchorVisible, 'Âncora permanece cravada ~0,5 s: ' + target.join(','));
    api.advance(0.1);
    const dissolved = api.getState();
    ok(dissolved.ancoras[0].dissolveProgress > 0 || dissolved.casts === 0, 'Âncora dissolve após cravada: ' + target.join(','));
    api.advance(0.6);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-ancora-shock') && !api.scene.getObjectByName('tk-ancora-anchor'),
      'Cena limpa após ciclo: ' + target.join(','));
    directions.push({ target, phase: finished.phase });
  }
  api.setTarget(0,0.05,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.08);
    paths.push(JSON.stringify(api.getState().ancoras[0].chain.head));
    api.advance(1.5);
    memory.push(api.getState().memory);
  }
  if (repetitions > 0) {
    ok(new Set(paths).size === paths.length, 'Rastros diferentes entre disparos');
    ok(memory.slice(1).every(value => JSON.stringify(value) === JSON.stringify(memory[0])), 'Memória estável após ciclos');
  }
  if (integration) {
    const before = api.getState().target;
    api.setTarget(NaN, Infinity, 0);
    ok(JSON.stringify(api.getState().target) === JSON.stringify(before), 'Alvo inválido não altera cena');
    const THREE = { Scene: api.scene.constructor, Vector3: api.camera.position.constructor };
    const { AncoraVfxController } = await import('/src/presentation/effects/tkSkills/ancora/AncoraVfx.ts');
    const scene = new THREE.Scene();
    const controller = new AncoraVfxController(scene);
    controller.castAncora(new THREE.Vector3(0, 1, 0), new THREE.Vector3(NaN, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castAncora(new THREE.Vector3(0, 1, i + 1), new THREE.Vector3(i + 1, 0.05, 0));
    ok(controller.getActiveCastCount() === 3, 'Limite de três âncoras simultâneas');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castAncora(new THREE.Vector3(0, 1, 2), new THREE.Vector3(2, 0.05, 1));
      let elapsed = 0;
      while (elapsed + 1/fps < 0.35 - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      ok(controller.getPhase() === 'chain', 'Sem queda antecipada a ' + fps + ' fps');
      controller.update(0.35 - elapsed + 1/120);
      ok(controller.getPhase() !== 'chain', 'Queda inicia após a corrente a ' + fps + ' fps');
      controller.clear();
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0.05,0); api.cast(); api.advance(0.08);
  return { checks, directions, memory };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [] };
const targets = [[0,0.05,0],[-4.5,0.05,0],[3.4,0.05,2.6],[3.4,0.05,-2.6],
  [-3,0.05,3.4],[-3,0.05,-3.4],[0,4.4,0],[5.5,0.05,-4.5],
  [-5.5,0.05,-4.5],[0,0.05,4.8],[0,0.05,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_ANCORA_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 6; cycle++) {
  const result = await evaluate("window.__TK_ANCORA_QA__([], 2, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12, "Menos de 12 ciclos de memória coletados");
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_ANCORA_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_ANCORA__.getState().target"), [0, 4.4, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_ANCORA__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_ANCORA__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_ANCORA__.getState().speed"), 0.25);
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-ancora-chain", "api.clear(); api.cast(); api.advance(0.14);"],
  ["tk-ancora-impact", "api.advance(0.4);"],
  ["tk-ancora-final", "api.advance(0.25); api.camera.position.set(0,6.5,10); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_ANCORA__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_ANCORA__.renderer;
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
  results.inputLimitations.push("requestAnimationFrame suspenso no navegador integrado; duração validada quadro a quadro, reprodução automática não verificada.");
}
await fs.writeFile(path.join(output, "tk-ancora-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1) }, null, 2)}\n`);
