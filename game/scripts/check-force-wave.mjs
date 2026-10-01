import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCdpQa } from "./vfx/qa-cdp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "vfx/evidence");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
const { command, evaluate } = createCdpQa(binary, process.env.AGENT_BROWSER_CDP);
const url = "http://127.0.0.1:5173/vfx/tk-force-wave.html?qa=1";
async function ensurePage() {
  await command("open", url);
  await command("wait", "--fn", "Boolean(window.__UAIDZIN_FORCE_WAVE__)");
}
await ensurePage();
const results = await evaluate(`(async () => {
  const api = window.__UAIDZIN_FORCE_WAVE__;
  const controller = api.controller;
  const Vector3 = api.camera.position.constructor;
  const checks = [];
  const ok = (value, label) => { if (!value) throw new Error(label); checks.push(label); };
  const near = (a, b) => Math.hypot(...a.map((value, i) => value - b[i])) < 1e-5;
  const origin = [-1.25, 1.05, 0];
  const targets = [[1.5,1.05,0],[-4,1.05,0],[-1.25,1.05,3],[-1.25,1.05,-3],
    [1.5,1.05,2],[1.5,1.05,-2],[-4,1.05,2],[-4,1.05,-2],[-1.25,4,0],[-1.25,0.1,0],[-1.25,1.05,0]];
  const directions = [];
  api.setPaused(true);
  api.setOrigin(...origin);
  for (const target of targets) {
    api.setTarget(...target);
    api.cast();
    if (near(origin, target)) {
      ok(controller.getActiveCastCount() === 0, 'Distância zero recusada');
      ok(controller.getSystems().length === 0, 'Distância zero sem sistemas');
      continue;
    }
    ok(controller.getPhase() === 'startup', 'Startup: ' + target);
    ok(controller.getSystems().length === 5, 'Cinco sistemas: ' + target);
    api.advance(1/60);
    ok(controller.getPhase() === 'startup', 'Startup dura ao menos 20 ms: ' + target);
    ok(controller.getSystems()[3].particleNum === 0, 'Sem impacto no startup: ' + target);
    api.advance(1/60);
    ok(controller.getPhase() === 'travel', 'Viagem começa em 33 ms: ' + target);
    api.advance(4/60);
    const flight = controller.getCastStates()[0];
    const systems = controller.getSystems();
    ok(near(flight.origin, origin), 'Origem preservada em 3D: ' + target);
    ok(near(flight.target, target), 'Alvo preservado em 3D: ' + target);
    ok(systems[0].particleNum === 1, 'Uma onda principal: ' + target);
    ok(systems[1].particleNum >= 4 && systems[1].particleNum <= 8, '4–8 streaks: ' + target);
    ok(systems[2].particleNum === 4, 'Quatro pinceladas laterais: ' + target);
    ok(systems[3].paused && systems[3].particleNum === 0, 'Impacto isolado até contato: ' + target);
    ok(flight.head.every(Number.isFinite) && flight.direction.every(Number.isFinite), 'Coordenadas finitas: ' + target);
    const traveled = Math.hypot(...flight.head.map((v,i) => v - origin[i]));
    ok(traveled > 0 && traveled < flight.distance, 'Frente viaja rumo ao alvo: ' + target);
    const expected = origin.map((v,i) => v + flight.direction[i] * traveled);
    ok(near(flight.head, expected), 'Cabeça no vetor real: ' + target);
    ok(systems.every(s => s.emissionOverTime.value === 0 && s.emissionOverDistance.value === 0), 'Somente bursts: ' + target);
    api.advance(3/60);
    ok(controller.getPhase() === 'travel', 'Sem impacto antecipado em 150 ms: ' + target);
    ok(controller.getSystems()[4].particleNum >= 6 && controller.getSystems()[4].particleNum <= 12, '6–12 fragmentos: ' + target);
    const late = controller.getCastStates()[0];
    ok(!near(late.tail, origin), 'Cauda deixa a origem, não é feixe estático: ' + target);
    api.advance(1/60);
    const impact = controller.getCastStates()[0];
    ok(controller.getPhase() === 'impact', 'Contato em 167 ms: ' + target);
    ok(Math.abs(impact.phaseStartedAt - 10/60) < 1e-8, 'Relógio exato do impacto: ' + target);
    ok(near(impact.head, target), 'Impacto no alvo: ' + target);
    ok(controller.getSystems()[3].particleNum === 1, 'Burst único de impacto: ' + target);
    api.advance(8/60);
    ok(controller.getActiveCastCount() === 1, 'Dissipação ainda ativa em 300 ms: ' + target);
    api.advance(1/60);
    ok(controller.getActiveCastCount() === 0 && controller.getParticleCount() === 0 && controller.getSystems().length === 0, 'Cleanup em 317 ms: ' + target);
    directions.push({ target, flight, impact });
  }
  api.setTarget(1.5,1.05,0);
  api.cast();
  api.advance(0.1);
  const main = controller.getSystems()[0];
  ok(main.uTileCount === 4 && main.vTileCount === 4 && main.blendTiles, 'Flipbook 4×4 com interpolação');
  ok(main.instancingGeometry.attributes.position.count > 24, 'Fitas volumétricas subdivididas, não billboard de tela');
  ok(main.material.depthTest && !main.material.depthWrite, 'Oclusão de mundo sem escrita de profundidade');
  ok(main.material.blending === 1, 'Alpha normal, sem massa aditiva');
  ok(main.material.map.image.width === 1024 && main.material.map.image.height === 1024, 'Atlas 1024×1024');
  const canvas = main.material.map.image;
  const pixels = canvas.getContext('2d').getImageData(0,0,1024,1024).data;
  let opaque = 0, transparent = 0, partial = 0, colored = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i+3];
    if (a === 0) transparent++;
    else if (a < 240) partial++;
    else opaque++;
    if (a > 20 && Math.max(pixels[i],pixels[i+1],pixels[i+2]) - Math.min(pixels[i],pixels[i+1],pixels[i+2]) > 20) colored++;
  }
  ok(transparent > 500000 && partial > 10000, 'Fundo transparente e alpha gráfico variável');
  ok(colored === 0, 'Paleta branca sem cores saturadas');
  const tileCounts = [];
  for (let tile = 0; tile < 16; tile++) {
    let alpha = 0;
    const left = tile % 4 * 256, top = Math.floor(tile / 4) * 256;
    for (let y = top; y < top+256; y++) for (let x = left; x < left+256; x++) alpha += pixels[(y*1024+x)*4+3];
    tileCounts.push(alpha);
  }
  ok(new Set(tileCounts).size >= 12, '16 quadros não repetidos');
  ok(tileCounts[15] < Math.max(...tileCounts) * 0.25, 'Último quadro dissipa');
  api.clear();
  for (const fps of [30,60,144]) {
    api.cast();
    let elapsed = 0;
    while (elapsed + 1/fps < 10/60 - 1e-9) { controller.update(1/fps); elapsed += 1/fps; }
    ok(controller.getPhase() === 'travel', 'Sem impacto antecipado a ' + fps + ' FPS');
    controller.update(10/60 - elapsed);
    ok(controller.getPhase() === 'impact', 'Impacto correto a ' + fps + ' FPS');
    ok(Math.abs(controller.getCastStates()[0].phaseStartedAt - 10/60) < 1e-8, 'Tempo exato a ' + fps + ' FPS');
    api.clear();
  }
  const before = api.getState().target;
  api.setTarget(NaN,0,Infinity);
  ok(near(before, api.getState().target), 'Lab rejeita alvo inválido');
  controller.castForceWave(new Vector3(NaN,0,0), new Vector3(1,1,1));
  controller.castForceWave(new Vector3(), new Vector3(Infinity,0,0));
  ok(controller.getActiveCastCount() === 0, 'Controller rejeita coordenadas inválidas');
  api.cast();
  controller.update(NaN); controller.update(-1); controller.update(Infinity);
  ok(controller.getCastStates()[0].elapsed === 0, 'Deltas inválidos não avançam');
  api.clear();
  for (let i=0; i<12; i++) api.cast();
  ok(controller.getActiveCastCount() === 4 && controller.getSystems().length === 20, 'Limite de quatro casts');
  api.advance(0.35);
  ok(controller.getSystems().length === 0, 'Cleanup de casts concorrentes');
  const memory = [];
  for (let cycle=0; cycle<12; cycle++) {
    api.cast(); api.advance(0.18); api.advance(0.2);
    memory.push(api.getState().memory);
    ok(controller.getParticleCount() === 0, 'Zero partículas após ciclo ' + cycle);
  }
  ok(memory.every(m => JSON.stringify(m) === JSON.stringify(memory[0])), 'Memória estável em 12 ciclos');
  const { ForceWaveVfxController } = await import('/src/presentation/effects/tkSkills/force-wave/ForceWaveVfx.ts');
  const detachedScene = new api.scene.constructor();
  const detached = new ForceWaveVfxController(detachedScene);
  detached.castForceWave(new Vector3(0,1,0), new Vector3(2,3,0));
  detached.update(0.1);
  detached.clear();
  ok(detached.getSystems().length === 0 && detached.getParticleCount() === 0, 'Clear imediato');
  detached.dispose(); detached.dispose();
  ok(detachedScene.children.length === 0, 'Dispose idempotente');
  const { EffectManager } = await import('/src/presentation/effects/EffectManager.ts');
  const { getSkillVfxProfile } = await import('/src/presentation/effects/skill/SkillVfxCatalog.ts');
  const runtimeScene = new api.scene.constructor();
  const effects = new EffectManager(document.createElement('div'), runtimeScene);
  const profile = getSkillVfxProfile('tk_fis_force_wave');
  try {
    effects.dispatchSkillVfx({profile,origin:new Vector3(0,1.2,0),target:new Vector3(3,0.9,0),
      center:new Vector3(3,0.9,0),colorHex:profile.colorHex,facing:0,range:profile.range,radius:0,
      hits:[],hasHeal:false,hasBuff:false,hasTransform:false,hasSummon:false});
    effects.update(0.1,api.camera,1280,720);
    ok(effects.getSkillVfxState().active === 1, 'EffectManager despacha Force Wave');
    ok(Boolean(runtimeScene.getObjectByName('PhysicalForce_Main')), 'Runtime usa a onda Quarks nova');
    const emitter = runtimeScene.getObjectByName('PhysicalForce_Main');
    const world = emitter.getWorldPosition(new Vector3());
    ok(Math.abs(world.y-1.2) < 1e-5, 'Dispatch não prende origem ao chão');
    effects.clearSkillVfx();
    ok(effects.getSkillVfxState().active === 0, 'Saída de cena limpa runtime');
  } finally { effects.dispose(); }
  ok(api.renderer.info.programs.every(p => p.diagnostics?.runnable !== false), 'Shaders compilados sem erro');
  api.clear();
  const scrub = document.getElementById('time');
  scrub.value = '100'; scrub.dispatchEvent(new Event('input'));
  ok(controller.getPhase() === 'travel' && api.getState().paused, 'Scrub pausa e avança até o frame selecionado');
  const speed = document.getElementById('speed');
  speed.value = '0.2'; speed.dispatchEvent(new Event('input'));
  ok(api.getState().speed === 0.2, 'Controle de velocidade');
  document.getElementById('pause').click();
  ok(!api.getState().paused, 'Botão continuar');
  document.getElementById('pause').click();
  ok(api.getState().paused, 'Botão pausar');
  const selector = document.getElementById('target-direction');
  selector.value = '4'; selector.dispatchEvent(new Event('change'));
  ok(near(api.getState().target, [1.5,3,0]), 'Seletor de altura');
  const view = document.getElementById('view');
  view.value = 'top'; view.dispatchEvent(new Event('change'));
  ok(api.camera.position.y === 9, 'Seletor de câmera superior');
  selector.value = '0'; selector.dispatchEvent(new Event('change'));
  view.value = 'iso'; view.dispatchEvent(new Event('change'));
  speed.value = '1'; speed.dispatchEvent(new Event('input'));
  api.clear();
  return { skillId:'tk_fis_force_wave', checks, directions, memory, atlas:{opaque,transparent,partial,tileCounts},
    visualApproval:'pendente de Felipe' };
})()`);
assert(results.checks.length >= 250);
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "force-wave-qa.json"), JSON.stringify(results, null, 2));
const atlas = await evaluate(`(() => {
  const api = window.__UAIDZIN_FORCE_WAVE__;
  api.cast();
  const canvas = api.controller.getSystems()[0].material.map.image;
  const data = canvas.toDataURL('image/png').split(',')[1];
  api.clear();
  return data;
})()`);
await fs.writeFile(path.join(output, "force-wave-atlas.png"), Buffer.from(atlas, "base64"));
for (const [view, time] of [["iso", 0.1], ["top", 0.1333333333], ["side", 0.1333333333], ["third", 0.1333333333], ["iso", 0.2]]) {
  const image = await evaluate(`(() => {
    const api=window.__UAIDZIN_FORCE_WAVE__;
    api.clear(); api.setView('${view}'); api.cast(); api.advance(${time});
    api.renderer.setSize(1280,720,false); api.camera.aspect=1280/720; api.camera.updateProjectionMatrix(); api.render();
    return api.renderer.domElement.toDataURL('image/png').split(',')[1];
  })()`);
  await fs.writeFile(path.join(output, `force-wave-${time > 0.18 ? "impact" : view}.png`), Buffer.from(image, "base64"));
}
await evaluate("window.__UAIDZIN_FORCE_WAVE__.clear(); window.__UAIDZIN_FORCE_WAVE__.setView('iso'); window.dispatchEvent(new Event('resize'));");
console.log(`OK: Force Wave, ${results.checks.length} verificações, 11 direções, 12 ciclos e integração runtime.`);
