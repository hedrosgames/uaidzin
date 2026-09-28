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

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function staticChecks() {
  const shopsStr = read("game/src/data/balance/shops.json");
  const shops = JSON.parse(shopsStr);
  const merchant = shops.shops?.merchant || shops.merchant;
  const blacksmith = shops.shops?.blacksmith || shops.blacksmith;
  const catalog = read("game/src/data/items/item-catalog.ts");
  const wire = read("game/src/ui/wire/shop.ts");

  const merchantItemIds = (merchant?.slots || []).map((s) => s.itemId);
  if (!merchant || !merchantItemIds.includes("entry_d4") || !merchantItemIds.includes("entry_d8")) {
    fail("C14: mercador sem selos entry_d4..d8");
  } else ok("C14: mercador com selos");

  if (merchantItemIds.some((id) => /espada_curta|machado_leve|armadura_leve|capacete|anel_|colar_|brinco_/.test(id))) {
    fail("C14: mercador ainda vende gear (conflito grill)");
  } else ok("C14: mercador sem gear");

  const blacksmithItemIds = (blacksmith?.slots || []).map((s) => s.itemId);
  if (!blacksmith || !blacksmithItemIds.includes("espada_curta") || !blacksmithItemIds.includes("anel_ferro")) {
    fail("C10: ferreiro sem catálogo de peças");
  } else ok("C10: ferreiro catálogo");

  if (!catalog.includes("ITEM_CATALOG") || !catalog.includes("resolveItemIcon")) {
    fail("C11: item-catalog ausente");
  } else ok("C11: item-catalog");

  const icons = [
    "game/public/assets/icons/items/espada_curta.svg",
    "game/public/assets/icons/items/machado_leve.svg",
    "game/public/assets/icons/items/armadura_leve.svg",
    "game/public/assets/icons/items/capacete.svg",
    "game/public/assets/icons/items/anel_cobre.svg",
    "game/public/assets/icons/items/anel_ferro.svg",
    "game/public/assets/icons/items/colar_simples.svg",
    "game/public/assets/icons/items/brinco_osso.svg",
    "game/public/assets/icons/items/cajado_rustico.svg",
    "game/public/assets/icons/items/arco_curto.svg",
    "game/public/assets/icons/items/touca_couro.svg",
    "game/public/assets/icons/items/tunica.svg",
    "game/public/assets/icons/items/ori.svg",
    "game/public/assets/icons/items/lac.svg",
    "game/public/assets/icons/items/seal.svg",
  ];
  for (const rel of icons) {
    if (!exists(rel)) fail(`C11: falta ${rel}`);
    else ok(`C11: ${path.basename(rel)}`);
  }

  if (!wire.includes("shopIconSrc") || !wire.includes("resolveItemIcon")) {
    fail("C11: wire sem resolução de ícone");
  } else ok("C11: wire resolve ícone");

  if (!wire.includes("if (!ico) return")) fail("C11: loja não filtra sem ícone");
  else ok("C11: loja filtra sem ícone");
}

staticChecks();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(BASE + "/tools/save-wipe.html?auto=all", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);
  const frame = page.frameLocator("iframe").first();
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
  await frame.locator("#btnCreateFirst").click();
  await frame.locator("#newName").fill("Lojaz");
  await frame.locator("#btnCreateConfirm").click();
  await page.waitForTimeout(900);
  await frame.locator("#btnConnect").click();
  await page.waitForFunction(() => window.__UAIDZIN__?.session?.character?.name === "Lojaz", null, {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);

  const merchant = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    api.openPanel?.("shop", "Mercador", "merchant");
    await new Promise((r) => setTimeout(r, 400));
    const cards = [...document.querySelectorAll("#wire-ui #shopGrid .shop-card")];
    const names = cards.map((c) => c.querySelector(".nm")?.textContent?.trim() || "");
    const icons = cards.map((c) => c.querySelector("img.ico")?.getAttribute("src") || "");
    const allHaveIcon = icons.every((s) => !!s && /\.(svg|png)(\?|$)/i.test(s));
    const hasSeal = names.some((n) => /Selo D/i.test(n));
    const hasGear = names.some((n) => /Espada|Machado|Armadura|Capacete|Anel|Colar|Brinco/i.test(n));
    return { count: cards.length, names, allHaveIcon, hasSeal, hasGear };
  });

  if (!merchant.hasSeal) fail(`C14 UI: mercador sem selos — ${JSON.stringify(merchant.names)}`);
  else ok(`C14 UI: mercador ${merchant.count} slots com selos`);
  if (merchant.hasGear) fail("C14 UI: mercador ainda lista gear");
  else ok("C14 UI: mercador sem gear");
  if (!merchant.allHaveIcon || merchant.count < 1) fail("C14/C11 UI: mercador com card sem ícone");
  else ok("C14/C11 UI: mercador ícones ok");

  const smith = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    api.openPanel?.("shop", "Ferreiro", "blacksmith");
    await new Promise((r) => setTimeout(r, 400));
    const cards = [...document.querySelectorAll("#wire-ui #shopGrid .shop-card")];
    const names = cards.map((c) => c.querySelector(".nm")?.textContent?.trim() || "");
    const icons = cards.map((c) => c.querySelector("img.ico")?.getAttribute("src") || "");
    const allHaveIcon = icons.every((s) => !!s && /\.(svg|png)(\?|$)/i.test(s));
    const hasGear = names.some((n) => /Espada|Machado|Armadura|Capacete|Anel/i.test(n));
    const hasMat = names.some((n) => /Ori|Lac/i.test(n));
    return { count: cards.length, names, allHaveIcon, hasGear, hasMat };
  });

  if (!smith.hasGear || !smith.hasMat) fail(`C10 UI: ferreiro incompleto — ${JSON.stringify(smith.names)}`);
  else ok(`C10 UI: ferreiro ${smith.count} slots`);
  if (!smith.allHaveIcon || smith.count < 1) fail("C10/C11 UI: ferreiro com card sem ícone");
  else ok("C10/C11 UI: ferreiro ícones ok");

  const catalog = await page.evaluate(() => {
    const wireApi = window.__UAIDZIN__?.wire;
    const cat = wireApi?.getShopCatalog ? wireApi.getShopCatalog() : wireApi?.pullShopCatalog?.();
    if (!cat) return { ok: false, why: "no catalog", checks: [] };
    const missing = [];
    for (const item of Object.values(cat.items || {})) {
      if (!item.icon) missing.push(item.id);
    }
    for (const shop of Object.values(cat.shops || {})) {
      for (const slot of shop.slots || []) {
        const it = cat.items[slot.itemId];
        if (!it?.icon) missing.push(slot.itemId);
      }
    }
    const resolve = wireApi.resolveItemIcon;
    const checks = [
      resolve?.("mat_ori"),
      resolve?.("entry_d4"),
      resolve?.("espada_curta"),
      resolve?.("weapon_comum", "weapon", "Comum Espada Curta"),
    ];
    return { ok: missing.length === 0, missing, checks };
  });

  if (!catalog.ok) fail(`C11 catalog: sem ícone em ${JSON.stringify(catalog.missing)}`);
  else ok("C11 catalog: todos com ícone");
  if (catalog.checks.some((c) => !c)) fail(`C11 resolve: ${JSON.stringify(catalog.checks)}`);
  else ok("C11 resolveItemIcon ok");
} catch (err) {
  fail(String(err?.message || err));
} finally {
  await browser.close();
}

if (failed) {
  console.error(`FAIL check-c10-c14-c11 (${failed})`);
  process.exit(1);
}
console.log("PASS check-c10-c14-c11");
