import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_CORTE_URL ?? "http://127.0.0.1:5173/vfx/tk-corte.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_CORTE__)");
await evaluate(`window.__TK_CORTE_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_CORTE__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(1/60);
    const firstStep = api.getState();
    const cast = firstStep.castStates[0];
    ok(firstStep.casts === 1 && cast.slashes.length === 2, 'Duas trilhas por cast: ' + target.join(','));
    ok(firstStep.phase === 'slash', 'Fase de corte ativa: ' + target.join(','));
    ok(cast.slashes[0].progress > 0 && cast.slashes[0].progress < 1, 'Primeira trilha cortando: ' + target.join(','));
    ok(cast.slashes[1].progress === 0 && !cast.slashes[1].visible, 'Segunda trilha aguarda a primeira: ' + target.join(','));
    const blade = api.scene.getObjectByName('tk-corte-blade');
    ok(blade?.isMesh && blade.geometry.type === 'TubeGeometry', 'Trilha é malha volumétrica: ' + target.join(','));
    ok(Array.from(blade.geometry.attributes.position.array).every(Number.isFinite), 'Geometria finita: ' + target.join(','));
    const blades = [];
    api.scene.traverse(object => { if (object.name === 'tk-corte-blade') blades.push(object); });
    ok(blades.length === 2 && blades.every(mesh => mesh.visible || !mesh.material.uniforms.uOpacity.value), 'Apenas trilhas ativas visíveis: ' + target.join(','));
    ok(firstStep.particleSystems.some(system => system.particles > 0), 'Faíscas acompanham o corte: ' + target.join(','));
    api.advance(0.09 - 1/60);
    const secondStep = api.getState().castStates[0];
    ok(secondStep.slashes[0].progress === 1, 'Primeira trilha completa em 0,08 s: ' + target.join(','));
    ok(secondStep.slashes[1].progress > 0 && secondStep.slashes[1].progress < 1, 'Segunda trilha inicia após a primeira: ' + target.join(','));
    ok(Math.abs(secondStep.elapsed - 5 / 60) < 1e-6, 'Duração das trilhas em sequência fixa: ' + target.join(','));
    api.advance(0.08);
    ok(api.getPhase() === 'fade', 'Sem resíduo após os dois cortes: ' + target.join(','));
    api.advance(1);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(api.scene.getObjectByName('tk-corte-blade') === null, 'Malhas removidas da cena: ' + target.join(','));
    directions.push({ target, slashes: secondStep.slashes.map(slash => ({ progress: slash.progress, head: slash.head })) });
  }
  api.setTarget(3.7,1.05,0);
  const paths = [];
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.05);
    paths.push(JSON.stringify(api.getState().castStates[0].slashes.map(slash => slash.controlPoints ?? null)));
    api.advance(1);
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
    const { CorteVfxController, DEFAULT_CORTE_VFX_CONFIG } = await import('/src/presentation/effects/tkSkills/corte/CorteVfx.ts');
    const scene = new THREE.Scene();
    const controller = new CorteVfxController(scene);
    controller.castCorte(new THREE.Vector3(NaN,0,0), new THREE.Vector3(2,0,0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castCorte(new THREE.Vector3(), new THREE.Vector3(i + 1,0,0));
    ok(controller.getActiveCastCount() === DEFAULT_CORTE_VFX_CONFIG.maxConcurrentCasts, 'Limite de castes concorrentes respeitado');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    for (const fps of [30, 60, 144]) {
      controller.castCorte(new THREE.Vector3(), new THREE.Vector3(7,1,2));
      let elapsed = 0;
      const slashWindow = DEFAULT_CORTE_VFX_CONFIG.slashDelay + DEFAULT_CORTE_VFX_CONFIG.slashDuration;
      while (elapsed + 1/fps < slashWindow - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      ok(controller.getPhase() === 'slash', 'Corte ainda ativo a ' + fps + ' fps');
      controller.update(slashWindow - elapsed + 1 / 60);
      ok(controller.getPhase() === 'fade', 'Sequência encerra no tempo fixo a ' + fps + ' fps');
      const state = controller.getCastStates()[0];
      ok(state.elapsed >= slashWindow && state.elapsed < slashWindow + 1 / 60 + 1e-9, 'Acumulado fixo em 1/60 a ' + fps + ' fps');
      controller.clear();
    }
    controller.castCorte(new THREE.Vector3(), new THREE.Vector3(4,1,0));
    controller.update(1);
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(3.7,1.05,0); api.cast(); api.advance(0.05);
  return { checks, directions, memory, skillId: 'tk_fis_2' };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [], skillId: "tk_fis_2" };
const targets = [[3.7,1.05,0],[-7.5,1.05,0],[-3.45,1.05,5],[-3.45,1.05,-5],
  [1.5,1.05,4],[1.5,1.05,-4],[-7,1.05,4],[-7,1.05,-4],
  [-3.45,4.5,0],[-3.45,0.9,0],[-3.45,1.12,0]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_CORTE_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_CORTE_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_CORTE_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 40);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_CORTE__.getState().target"), [-3.45, 4.5, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_CORTE__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_CORTE__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_CORTE__.getState().speed"), 0.25);
await evaluate("document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))");
results.controls = ["direção elevada", "pausa", "velocidade"];
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-corte-primeira-trilha", "api.clear(); api.cast(); api.advance(0.04);"],
  ["tk-corte-segunda-trilha", "api.clear(); api.cast(); api.advance(0.12);"],
  ["tk-corte-dissipacao", "api.clear(); api.cast(); api.advance(0.2);"],
  ["tk-corte-topo", "api.clear(); api.cast(); api.advance(0.12); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,1,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_CORTE__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_CORTE__.renderer;
  return { error: renderer.getContext().getError(),
    shadersValid: renderer.info.programs.every(program => program.diagnostics?.runnable !== false) };
})()`);
assert.equal(results.webgl.error, 0);
assert.equal(results.webgl.shadersValid, true);
await fs.writeFile(path.join(output, "tk-corte-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1), skillId: results.skillId }, null, 2)}\n`);
