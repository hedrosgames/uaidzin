import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const url = process.env.TK_BASTIAO_URL ?? "http://127.0.0.1:5173/vfx/tk-bastiao.html";
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);

await command("set", "viewport", "1600", "900");
await command("open", `${url}?qa=1`);
await command("wait", "--fn", "Boolean(window.__UAIDZIN_TK_BASTIAO__)");
await evaluate(`window.__TK_BASTIAO_QA__ = async (targets, repetitions, integration) => {
  const api = window.__UAIDZIN_TK_BASTIAO__;
  const checks = [];
  const ok = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  api.setPaused(true);
  api.clear();
  const directions = [];
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    api.advance(0.07);
    const rise = api.getState();
    const cast = rise.bastioes[0];
    ok(rise.casts === 1, 'Um bastião por cast: ' + target.join(','));
    ok(rise.phase === 'rise', 'Estacas em subida: ' + target.join(','));
    ok(cast.stakes.length === 4, 'Quatro estacas no quadrado: ' + target.join(','));
    ok(cast.stakes.every(stake => !stake.risen), 'Estacas ainda enterradas no início: ' + target.join(','));
    ok(cast.stakes.every(stake => Array.from(stake.top).every(Number.isFinite)), 'Topos de estaca finitos: ' + target.join(','));
    ok(cast.stakes.every((stake, index, all) => {
      const next = all[(index + 1) % all.length];
      const opposite = all[(index + 2) % all.length];
      const side = Math.hypot(stake.top[0] - next.top[0], stake.top[2] - next.top[2]);
      const diagonal = Math.hypot(stake.top[0] - opposite.top[0], stake.top[2] - opposite.top[2]);
      return Math.abs(side - 2.2 * Math.SQRT2) < 1e-6 && Math.abs(diagonal - 4.4) < 1e-6;
    }),
      'Estacas equidistantes em quadrado: ' + target.join(','));
    const groups = api.scene.children.flatMap(object => object.name === 'tk-bastiao-vfx-root' ?
      object.children.filter(child => child.name === 'tk-bastiao-stake') : []);
    ok(groups.length === 4, 'Grupos de estaca no palco: ' + target.join(','));
    groups.forEach(group => ok(Array.from(group.children[0].geometry.attributes.position.array).every(Number.isFinite),
      'Geometria da estaca finita: ' + target.join(',')));
    ok(rise.particleSystems.length > 0 && rise.particleSystems.some(system => system.particles > 0),
      'Poeira nas juntas durante a subida: ' + target.join(','));
    const beforeY = cast.stakes[0].baseY;
    api.advance(1 / 30);
    const laterRise = api.getState().bastioes[0];
    ok(laterRise.stakes[0].baseY > beforeY, 'Estacas sobem entre quadros: ' + target.join(','));
    api.advance(0.5);
    const chains = api.getState();
    ok(chains.phase === 'chains', 'Correntes espetrais em sequência: ' + target.join(','));
    ok(chains.bastioes[0].stakes.every(stake => stake.risen), 'Estacas totalmente erguidas: ' + target.join(','));
    const chainStates = chains.bastioes[0].chains;
    ok(chainStates.some(chain => chain.visibleLinks > 0), 'Elos visíveis na primeira corrente: ' + target.join(','));
    ok(chainStates[0].progress >= chainStates[3].progress || chainStates[0].connected === chainStates[3].connected,
      'Correntes progridem em sequência: ' + target.join(','));
    api.advance(8/60);
    ok(api.getState().bastioes[0].chains[0].particles > 0,
      'Faíscas renderizadas na conexão da primeira corrente: ' + target.join(','));
    api.advance(0.45 - 8/60);
    const closed = api.getState();
    ok(closed.phase === 'hold', 'Cofre fechado em 0,94 s: ' + target.join(','));
    ok(closed.bastioes[0].chains.every(chain => chain.connected), 'Quatro correntes conectadas: ' + target.join(','));
    ok(closed.bastioes[0].lightIntensity > 3, 'Pulso de luz quente no fechamento (pico 6): ' + target.join(','));
    const flash = api.scene.getObjectByName('tk-bastiao-caster-flash');
    ok(flash?.isMesh, 'Flash de fechamento no caster: ' + target.join(','));
    const innerRing = api.scene.getObjectByName('tk-bastiao-ring-inner');
    const outerRing = api.scene.getObjectByName('tk-bastiao-ring-outer');
    ok(innerRing?.isMesh && innerRing.visible && innerRing.material.opacity > 0.3, 'Anel interno de aço visível: ' + target.join(','));
    ok(outerRing?.isMesh && outerRing.visible && outerRing.material.opacity > 0.3, 'Anel externo de aço visível: ' + target.join(','));
    const light = api.scene.children.flatMap(object => object.isPointLight ? [object] :
      object.children?.filter(child => child.isPointLight) ?? []);
    ok(light.some(point => point.intensity > 1.5), 'PointLight pulsando no caster: ' + target.join(','));
    directions.push({ target, light: closed.bastioes[0].lightIntensity, elapsed: closed.bastioes[0].elapsed });
    api.advance(1.4);
    const descending = api.getState();
    ok(descending.phase === 'descend' || descending.casts === 0, 'Estacas descem após o estado: ' + target.join(','));
    api.advance(1.2);
    const finished = api.getState();
    ok(finished.casts === 0 && finished.particles === 0 && finished.systems === 0, 'Cleanup: ' + target.join(','));
    ok(!api.scene.getObjectByName('tk-bastiao-stake') && !api.scene.getObjectByName('tk-bastiao-ring-inner'),
      'Cena limpa após ciclo: ' + target.join(','));
  }
  api.setTarget(0,0.05,0);
  const memory = [];
  for (let i = 0; i < repetitions; i++) {
    api.cast();
    api.advance(0.1);
    api.advance(2.8);
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
    const { BastiaoVfxController } = await import('/src/presentation/effects/tkSkills/bastiao/BastiaoVfx.ts');
    const scene = new THREE.Scene();
    const controller = new BastiaoVfxController(scene);
    controller.castBastiao(new THREE.Vector3(NaN, 0, 0));
    ok(controller.getActiveCastCount() === 0, 'Controller recusa coordenadas inválidas');
    for (let i = 0; i < 8; i++) controller.castBastiao(new THREE.Vector3(i + 1, 0, 0));
    ok(controller.getActiveCastCount() === 2, 'Limite de dois bastiões simultâneos');
    controller.clear();
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0, 'Clear imediato');
    const timeline = [0.45, 0.49, 1.2, 0.35];
    for (const fps of [30, 60, 144]) {
      controller.castBastiao(new THREE.Vector3(2, 0.05, 1));
      let elapsed = 0;
      while (elapsed + 1/fps < timeline[0] - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      ok(controller.getPhase() === 'rise', 'Sem correntes antecipadas a ' + fps + ' fps');
      controller.update(timeline[0] - elapsed);
      elapsed = timeline[0];
      while (elapsed + 1/fps < 0.94 - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      controller.update(0.94 - elapsed + 1/60);
      ok(controller.getPhase() === 'hold', 'Cofre fechado em 0,94 s a ' + fps + ' fps');
      ok(Math.abs(controller.getCastStates()[0].elapsed - 0.94) <= 1/60 + 1e-6,
        'Fechamento dentro de um passo fixo a ' + fps + ' fps');
      elapsed = 0.94 + 1/60;
      while (elapsed + 1/fps < 2.49 - 1e-9) {
        controller.update(1/fps);
        elapsed += 1/fps;
      }
      controller.update(2.49 - elapsed);
      ok(controller.getPhase() === 'descend' || controller.getActiveCastCount() === 0,
        'Descida em 2,49 s a ' + fps + ' fps');
      controller.clear();
    }
    controller.dispose(); controller.dispose();
    ok(scene.children.length === 0, 'Dispose idempotente remove todos os recursos da cena');
  }
  api.setTarget(0,0.05,0); api.cast(); api.advance(0.07);
  return { checks, directions, memory };
}; true`);
const results = { checks: [], directions: [], memory: [], inputLimitations: [] };
const targets = [[0,0.05,0],[-4.5,0.05,0],[3.4,0.05,2.6],[3.4,0.05,-2.6],
  [-3,0.05,3.4],[-3,0.05,-3.4],[0,4.4,0],[0,0.05,0],
  [5.2,0.05,0],[-5.2,0.05,-2],[0,0.05,4.6]];
for (const target of targets) {
  const result = await evaluate(`window.__TK_BASTIAO_QA__([${JSON.stringify(target)}], 0, false)`);
  results.checks.push(...result.checks);
  results.directions.push(...result.directions);
}
for (let cycle = 0; cycle < 4; cycle++) {
  const result = await evaluate("window.__TK_BASTIAO_QA__([], 3, false)");
  results.checks.push(...result.checks);
  results.memory.push(...result.memory);
}
assert(results.memory.length >= 12, "Memória avaliada em menos de 12 ciclos.");
assert(results.memory.every(value => JSON.stringify(value) === JSON.stringify(results.memory[0])));
const integration = await evaluate("window.__TK_BASTIAO_QA__([], 0, true)");
results.checks.push(...integration.checks);
assert(results.checks.length > 60);
await command("select", "#target-direction", "6");
assert.deepEqual(await evaluate("window.__UAIDZIN_TK_BASTIAO__.getState().target"), [0, 4.4, 0]);
await command("click", "#pause");
if (!(await evaluate("window.__UAIDZIN_TK_BASTIAO__.getState().paused"))) {
  results.inputLimitations.push("CDP não entregou clique nativo; botão de pausa validado por evento DOM.");
  await evaluate("document.getElementById('pause').click()");
}
assert.equal(await evaluate("window.__UAIDZIN_TK_BASTIAO__.getState().paused"), true);
await command("select", "#target-direction", "0");
await evaluate("document.getElementById('pause').click()");
await evaluate(`document.getElementById('speed').value='0.25'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
assert.equal(await evaluate("window.__UAIDZIN_TK_BASTIAO__.getState().speed"), 0.25);
await evaluate(`document.getElementById('speed').value='1'; document.getElementById('speed').dispatchEvent(new Event('input'))`);
await fs.mkdir(output, { recursive: true });
for (const [name, code] of [
  ["tk-bastiao-rise", "api.clear(); api.cast(); api.advance(0.12);"],
  ["tk-bastiao-chains", "api.advance(0.45);"],
  ["tk-bastiao-hold", "api.advance(0.5);"],
  ["tk-bastiao-top", "api.clear(); api.cast(); api.advance(1.2); api.camera.position.set(0,12,0.1); api.camera.lookAt(0,0.6,0); api.render();"],
]) {
  const capture = await evaluate(`(() => {
    const api = window.__UAIDZIN_TK_BASTIAO__;
    ${code}
    api.render();
    return api.renderer.domElement.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(capture.split(",")[1], "base64"));
}
results.webgl = await evaluate(`(() => {
  const renderer = window.__UAIDZIN_TK_BASTIAO__.renderer;
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
await fs.writeFile(path.join(output, "tk-bastiao-results.json"), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ checks: results.checks.length, directions: results.directions.length, memory: results.memory.at(-1) }, null, 2)}\n`);
