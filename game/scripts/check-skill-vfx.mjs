import { chromium } from "playwright";

const targetUrl = process.env.VFX_CATALOG_URL ?? "http://127.0.0.1:5173/vfx/skill-catalog.html";
const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
page.on("requestfailed", (request) => errors.push(`request: ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`));

try {
  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.ready === "true", null, { timeout: 120000 });
  const catalog = await page.evaluate(() => window.__UAIDZIN_SKILL_VFX__);
  if (catalog.count !== 96 || catalog.profiles.length !== 96) {
    throw new Error(`Catálogo inválido: count=${catalog.count}, profiles=${catalog.profiles.length}`);
  }
  if (new Set(catalog.profiles.map((profile) => profile.id)).size !== 96) {
    throw new Error("IDs de skills duplicados");
  }

  await page.evaluate(() => window.__UAIDZIN_SKILL_VFX__.setPaused(true));
  for (const profile of catalog.profiles) {
    await page.evaluate((id) => {
      const api = window.__UAIDZIN_SKILL_VFX__;
      api.select(id);
      api.clear();
    }, profile.id);
  }
  const cleared = await page.evaluate(() => window.__UAIDZIN_SKILL_VFX__.getState());
  if (cleared.active !== 0 || cleared.particles !== 0) {
    throw new Error(`Catálogo deixou resíduos: ${JSON.stringify(cleared)}`);
  }

  const representatives = [
    "tk_fis_fire_burst",
    "tk_fis_earthquake",
    "bm_ctrl_dragao",
    "ht_fis_tiro_certeiro",
    "tk_fis_mestre_dual",
  ];
  const states = [];
  for (const id of representatives) {
    const state = await page.evaluate((skillId) => {
      const api = window.__UAIDZIN_SKILL_VFX__;
      api.clear();
      api.select(skillId);
      api.setPaused(true);
      api.advance(0.2);
      return api.getState();
    }, id);
    if (state.particles <= 0) throw new Error(`${id} não produziu partículas`);
    states.push({ id, ...state });
    await page.evaluate(() => window.__UAIDZIN_SKILL_VFX__.clear());
  }

  const webgl = await page.evaluate(() => Boolean(document.getElementById("gl")?.getContext("webgl2") ?? document.getElementById("gl")?.getContext("webgl")));
  if (!webgl) throw new Error("Canvas sem contexto WebGL");
  if (errors.length > 0) throw new Error(errors.join(" | "));
  console.log(JSON.stringify({ count: catalog.count, cleared, states, webgl, errors }, null, 2));
} finally {
  await browser.close();
}
