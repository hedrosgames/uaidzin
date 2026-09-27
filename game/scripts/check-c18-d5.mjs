import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed += 1;
  console.error("FAIL", m);
};

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function staticChecks() {
  const wire = read("game/src/ui/wire/portal.ts");
  if (!wire.includes("portalDurationLabel") || !wire.includes(">Tempo<")) fail("C18 wire sem Tempo");
  else ok("C18 wire Tempo");
  if (!wire.includes("entry-ico") || !wire.includes('icon: "seal"')) fail("C18 wire sem ícone de entrada");
  else ok("C18 wire ícone entrada");
  if (!fs.existsSync(path.join(ROOT, "game/public/assets/icons/items/seal.svg"))) fail("C18 seal.svg ausente");
  else ok("C18 seal.svg");

  const scene = read("game/src/presentation/rendering/SceneRenderer.ts");
  if (!scene.includes("isFixedOccluder") || !scene.includes("occlusionIgnore")) {
    fail("D5 SceneRenderer sem filtro de oclusão");
  } else ok("D5 SceneRenderer filtro");

  const enemies = read("game/src/presentation/enemies/EnemyRuntimeView.ts");
  if (!enemies.includes("occlusionIgnore")) fail("D5 enemies sem occlusionIgnore");
  else ok("D5 enemies occlusionIgnore");
}

async function wipe(page) {
  await page.goto(BASE + "/tools/save-wipe.html?auto=all", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
}

async function loginAdmin(page, frame) {
  await frame.locator("#user").waitFor({ timeout: 20000 });
  await frame.locator("#user").fill("admin");
  await frame.locator("#pass").fill("admin");
  await frame.locator("#btnLogin").click();
  await page.waitForFunction(
    () => {
      const f = document.querySelector("iframe");
      return !!f && /02-selecao/.test(f.contentWindow?.location?.href || "");
    },
    null,
    { timeout: 20000 },
  );
}

staticChecks();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await wipe(page);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);
  const frame = page.frameLocator("iframe").first();
  await loginAdmin(page, frame);

  await frame.locator("#btnCreateFirst").click();
  await frame.locator("#newName").fill("Cardoz");
  await frame.locator("#btnCreateConfirm").click();
  await page.waitForTimeout(900);
  await frame.locator("#btnConnect").click();
  await page.waitForFunction(
    () => window.__UAIDZIN__?.session?.character?.name === "Cardoz",
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(1200);

  const opened = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    if (!api) return { ok: false, why: "no api" };
    api.openPanel?.("portal");
    await new Promise((r) => setTimeout(r, 400));
    const host = document.querySelector("#wire-ui");
    if (!host) return { ok: false, why: "no wire" };
    const cards = [...host.querySelectorAll(".portal-card")];
    if (!cards.length) return { ok: false, why: "no cards" };
    const html = cards.map((c) => c.innerHTML).join("\n");
    return {
      ok: true,
      count: cards.length,
      hasTempo: /Tempo/.test(html) && /\d+:\d{2}/.test(html),
      hasNivel: /Nível/.test(html),
      hasEntryIco: !!host.querySelector(".portal-card .entry-ico"),
      hasSealImg: [...host.querySelectorAll(".portal-card img")].some((img) =>
        /seal\.svg/.test(img.getAttribute("src") || ""),
      ),
    };
  });

  console.log("C18_UI", JSON.stringify(opened));
  if (!opened.ok) fail("C18 portal UI: " + opened.why);
  else {
    ok("C18 cards=" + opened.count);
    if (!opened.hasTempo) fail("C18 cards sem Tempo");
    else ok("C18 Tempo visível");
    if (!opened.hasNivel) fail("C18 cards sem Nível");
    else ok("C18 Nível visível");
    if (!opened.hasEntryIco) fail("C18 sem entry-ico");
    else ok("C18 entry-ico");
    if (!opened.hasSealImg) fail("C18 sem seal.svg nos cards D4+");
    else ok("C18 seal nos cards com entrada");
  }

  const d5 = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    if (!api) return { ok: false, why: "no api" };
    api.closePanels?.();
    const result = api.enterDungeonById?.("dungeon-1") || api.enterDungeon?.();
    if (result && result.ok === false) return { ok: false, why: "enter " + result.reason };
    for (let i = 0; i < 80; i++) {
      const mode = api.getSnapshot?.()?.mode || api.getState?.();
      if (mode === "DUNGEON") break;
      await new Promise((r) => setTimeout(r, 50));
    }
    await new Promise((r) => setTimeout(r, 600));
    const meshes = api.getEnemyMeshState?.() || [];
    const ignore = meshes.filter((m) => m && m.occlusionIgnore === true);
    return {
      ok: true,
      mode: api.getSnapshot?.()?.mode || api.getState?.(),
      meshCount: meshes.length,
      ignoreCount: ignore.length,
      enter: result || null,
    };
  });

  console.log("D5_RT", JSON.stringify(d5));
  if (!d5.ok) fail("D5 runtime: " + d5.why);
  else if (d5.mode !== "DUNGEON") fail("D5: modo " + d5.mode);
  else if (d5.meshCount === 0) fail("D5: nenhum mesh de inimigo após entrar D1");
  else if (d5.ignoreCount < d5.meshCount) fail("D5: meshes sem occlusionIgnore");
  else ok("D5 enemies occlusionIgnore runtime=" + d5.ignoreCount);
} catch (e) {
  fail("playwright: " + (e && e.message ? e.message : String(e)));
} finally {
  await browser.close();
}

if (failed) {
  console.error("FAILED", failed);
  process.exit(1);
}
console.log("PASS check-c18-d5");
