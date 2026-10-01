import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
const evidence = new URL("../vfx/evidence/death-stab/", import.meta.url);
await fs.mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks++; };
try {
  await page.goto(`${base}/vfx/tk-death-stab.html?qa=1`);
  await page.waitForFunction(() => document.body.dataset.ready === "true");
  await page.waitForFunction(() => {
    const image = window.__UAIDZIN_TK_DEATH_STAB__.controller.resources.atlas.image;
    return image?.complete && image.naturalWidth > 0;
  });
  const directions = [[4, 0, 0], [-4, 0, 0], [0, 0, 4], [0, 0, -4], [3, 0, 3], [-3, 0, -3],
    [3, 0, -3], [-3, 0, 3], [0, 4, 0], [0, -4, 0], [0, 0, 0]];
  for (const target of directions) {
    const result = await page.evaluate(target => {
      const api = window.__UAIDZIN_TK_DEATH_STAB__;
      api.setTarget(...target);
      api.cast();
      const birth = api.getState();
      api.advance(0.05);
      const flight = api.getState();
      const systems = api.controller.getSystems();
      const particles = systems.filter(system => system.emitter.name === "DeathStab_MainWaves")
        .flatMap(system => system.particles.slice(0, system.particleNum).map(particle => ({
          position: [particle.position.x, particle.position.y, particle.position.z],
          velocity: [particle.velocity.x, particle.velocity.y, particle.velocity.z],
          size: [particle.size.x, particle.size.y, particle.size.z],
        })));
      const impactBeforeArrival = systems.filter(system => system.emitter.name.includes("Impact"))
        .some(system => system.particleNum > 0);
      api.advance(0.65);
      return { birth, flight, particles, impactBeforeArrival, end: api.getState() };
    }, target);
    check(result.end.casts === 0, `cleanup casts ${target}`);
    check(result.end.particles === 0, `cleanup particles ${target}`);
    check(result.end.systems === 0, `cleanup systems ${target}`);
    if (target.every(value => value === 0)) {
      check(result.birth.casts === 0, "Alvo na origem recusado");
      continue;
    }
    check(result.birth.casts === 1, `cast ${target}`);
    check(result.flight.particles > 0, `emissão ${target}`);
    check(!result.impactBeforeArrival, `impacto não antecipa contato ${target}`);
    check(result.birth.castStates[0].waves.length === 5, "Cinco rajadas");
    const state = result.birth.castStates[0];
    check(state.duration <= 0.45, "Duração máxima");
    for (const particle of result.particles) {
      const offset = particle.position.map((value, index) => value - state.origin[index]);
      const projection = offset.reduce((sum, value, index) => sum + value * state.direction[index], 0);
      const total = Math.hypot(...state.target.map((value, index) => value - state.origin[index]));
      check(projection > 0 && projection < total, "Onda ocupa posição intermediária");
      check(particle.position.every(Number.isFinite), "Posição finita");
      check(particle.size.every(value => Number.isFinite(value) && value > 0), "Escala finita positiva");
      const speed = Math.hypot(...particle.velocity);
      check(particle.velocity.every((value, index) => Math.abs(value / speed - state.direction[index]) < 1e-5), "Velocidade alinhada ao ataque");
    }
  }
  const validation = await page.evaluate(async () => {
    const api = window.__UAIDZIN_TK_DEATH_STAB__;
    const Vector3 = api.camera.position.constructor;
    api.clear();
    api.controller.castDeathStab(new Vector3(NaN, 0, 0), new Vector3(4, 0, 0));
    api.controller.castDeathStab(new Vector3(), new Vector3(Infinity, 0, 0));
    const invalid = api.getState().casts;
    for (let index = 0; index < 8; index++) api.controller.castDeathStab(new Vector3(), new Vector3(4, 0, 0));
    const concurrent = api.getState().casts;
    api.advance(0.6);
    const after = api.getState();
    const point = new Vector3(0.3, 1.45, 0.4);
    api.controller.castDeathStab(new Vector3(), new Vector3(4, 0, 0), point);
    const exactOrigin = api.getState().castStates[0].origin;
    api.clear();
    const frameStates = [];
    for (const fps of [30, 60, 120]) {
      api.controller.castDeathStab(new Vector3(), new Vector3(4, 0, 0));
      for (let step = 0; step < fps / 10; step++) api.controller.update(1 / fps);
      frameStates.push(api.getState().castStates[0]);
      api.clear();
    }
    return { invalid, concurrent, after, exactOrigin, frameStates };
  });
  check(validation.invalid === 0, "Coordenadas inválidas recusadas");
  check(validation.concurrent === 4, "Limite de concorrência");
  check(validation.after.systems === 0, "Limpeza após saturação");
  check(JSON.stringify(validation.exactOrigin) === JSON.stringify([0.3, 1.45, 0.4]), "Ponta da arma preservada");
  check(validation.frameStates.every(state => Math.abs(state.elapsed - 0.1) < 1e-6), "Timing independente do framerate");
  const memories = await page.evaluate(() => {
    const api = window.__UAIDZIN_TK_DEATH_STAB__;
    const samples = [];
    api.setTarget(4, 0, 0);
    for (let cycle = 0; cycle < 14; cycle++) {
      api.cast();
      api.advance(0.1);
      api.render();
      api.advance(0.6);
      api.render();
      samples.push(api.getState().memory);
    }
    return samples;
  });
  for (const memory of memories.slice(2)) {
    check(memory.geometries === memories[2].geometries, "Geometrias estáveis");
    check(memory.textures === memories[2].textures, "Texturas estáveis");
  }
  const integration = await page.evaluate(async () => {
    const api = window.__UAIDZIN_TK_DEATH_STAB__;
    const { EffectManager } = await import("/src/presentation/effects/EffectManager.ts");
    const { getSkillVfxProfile } = await import("/src/presentation/effects/skill/SkillVfxCatalog.ts");
    const Vector3 = api.camera.position.constructor;
    const effects = new EffectManager(document.body, api.scene);
    effects.dispatchSkillVfx({ profile: getSkillVfxProfile("tk_fis_death_stab"),
      origin: new Vector3(), target: new Vector3(4, 0, 0), center: new Vector3(4, 0, 0),
      attackPoint: new Vector3(0.4, 1.4, 0), colorHex: 0xffffff, facing: 0,
      range: 6, radius: 0, hits: [], hasHeal: false, hasBuff: false, hasTransform: false, hasSummon: false });
    const count = effects.tkRegistry.getActiveCastCount();
    const origin = effects.tkRegistry.get("death-stab").getCastStates()[0].origin;
    effects.dispose();
    return { count, origin };
  });
  check(integration.count === 1, "Integração EffectManager");
  check(integration.origin[1] === 1.4, "Integração preserva ponta da arma");
  for (const [name, camera, time] of [
    ["flight-isometric", [0, 4.6, 8.4], 0.1],
    ["impact", [0, 4.6, 8.4], 0.17],
    ["flight-top", [0, 8, 3], 0.1],
    ["flight-axis", [-6, 2, 0.3], 0.1],
  ]) {
    await page.evaluate(({ camera, time }) => {
      const api = window.__UAIDZIN_TK_DEATH_STAB__;
      api.clear(); api.setTarget(4, 0, 0);
      api.camera.position.set(...camera); api.camera.lookAt(1.6, 1, 0);
      api.cast(); api.advance(time); api.render();
    }, { camera, time });
    await page.screenshot({ path: new URL(`${name}.png`, evidence).pathname.replace(/^\/([A-Z]:)/, "$1") });
  }
  check(errors.length === 0, `Console e shaders: ${errors.join("; ")}`);
  await fs.writeFile(new URL("qa.json", evidence), JSON.stringify({ checks, errors, memories, integration }, null, 2));
  process.stdout.write(`Death Stab: ${checks} verificações passaram.\n`);
} finally {
  await browser.close();
}

