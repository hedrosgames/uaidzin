import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
const evidenceDir = process.env.UAIDZIN_EVIDENCE_DIR;
const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => {
  if (message.type() === "error") errors.push(message.text());
});

try {
  await page.goto(`${base}/vfx/skill-catalog.html?qa=1`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.ready === "true", null, { timeout: 120000 });
  const sizing = await page.addStyleTag({ content: "#stage{width:320px!important;height:180px!important}" });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  const profiles = await page.evaluate(() => window.__UAIDZIN_SKILL_VFX__.profiles.filter(profile => ["BM", "HT", "FM"].includes(profile.classId)));
  assert.equal(profiles.length, 72);
  assert.equal(new Set(profiles.map(profile => profile.id)).size, 72);
  const directions = [[8, 0, 0], [-8, 0, 0], [0, 0, 8], [0, 0, -8], [6, 0, 6], [-6, 0, 6], [6, 0, -6], [-6, 0, -6], [0, 0, 0], [0, 4, 0], [0, -1, 0]];
  for (const profile of profiles) {
    const result = await page.evaluate(({ id, directions }) => {
      const api = window.__UAIDZIN_SKILL_VFX__;
      const faults = [];
      let maxParticles = 0;
      let rendered = false;
      const finite = () => {
        api.scene.updateMatrixWorld(true);
        api.scene.traverse(object => {
          if (!object.matrixWorld.elements.every(Number.isFinite)) faults.push(`${object.name}: matriz inválida`);
          if (object.isInstancedMesh && ![...object.instanceMatrix.array].every(Number.isFinite)) faults.push(`${object.name}: instâncias inválidas`);
        });
      };
      for (const [x, y, z] of directions) {
        api.clear();
        const origin = api.getState().origin;
        api.setTarget(origin[0] + x, origin[1] + y, origin[2] + z);
        api.select(id);
        if (api.getState().active < 1) faults.push("cast não iniciou");
        for (const step of [0.12, 0.16, 0.3, 0.5]) {
          api.advance(step);
          finite();
          maxParticles = Math.max(maxParticles, api.getState().particles);
          if (!rendered && api.getState().particles > 0) {
            api.render();
            rendered = true;
          }
        }
        api.advance(4);
        const state = api.getState();
        if (state.active !== 0 || state.particles !== 0) faults.push(`resíduos: ${JSON.stringify(state)}`);
      }
      return { faults, maxParticles, rendered, glError: api.renderer.getContext().getError() };
    }, { id: profile.id, directions });
    assert.deepEqual(result.faults, [], profile.id);
    assert.ok(result.maxParticles > 0, `${profile.id}: partículas`);
    assert.equal(result.rendered, true, `${profile.id}: render de efeito ativo`);
    assert.equal(result.glError, 0, `${profile.id}: WebGL`);
    console.log(`OK VFX ${profile.id}: onze direções, render, partículas e limpeza`);
  }
  const memory = await page.evaluate(() => {
    const api = window.__UAIDZIN_SKILL_VFX__;
    const ids = ["bm_ctrl_dragao", "ht_mag_flecha_ignea", "fm_mag_esfera_ignea", "fm_mag_lanca_glacial", "fm_mag_choque_vital"];
    const samples = [];
    for (let cycle = 0; cycle < 12; cycle++) {
      for (const id of ids) {
        api.clear();
        api.setTarget(3.7, 0.95, 0);
        api.select(id);
        api.advance(0.25);
        api.render();
        api.advance(5);
        api.render();
      }
      samples.push(api.getState().memory);
    }
    return samples;
  });
  for (const sample of memory.slice(3)) assert.deepEqual(sample, memory[3], "memória estável após aquecimento");
  if (evidenceDir) {
    await mkdir(evidenceDir, { recursive: true });
    await sizing.evaluate(element => element.remove());
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    for (const id of ["bm_ctrl_dragao", "ht_fis_rapid_hit", "fm_mag_esfera_ignea"]) {
      assert.ok(profiles.some(profile => profile.id === id), id);
      await page.evaluate(id => {
        const api = window.__UAIDZIN_SKILL_VFX__;
        api.clear();
        api.setTarget(3.7, 0.95, 0);
        api.select(id);
        api.advance(0.25);
        api.render();
      }, id);
      await page.screenshot({ path: path.join(evidenceDir, `vfx-${id}.png`) });
    }
  }
  assert.deepEqual(errors, [], "erros do navegador e shader");
  console.log(JSON.stringify({ skills: profiles.length, directions: 11, cycles: memory.length, memory: memory.at(-1), errors }, null, 2));
} finally {
  await browser.close();
}
