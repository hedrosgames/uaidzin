import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed += 1;
  console.error("FAIL", m);
};

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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await wipe(page);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(600);
let frame = page.frameLocator("iframe").first();
await loginAdmin(page, frame);

await frame.locator("#btnOptions").click();
const logoutBtn = frame.locator("#btnLogout");
if ((await logoutBtn.count()) > 0) ok("S8: Deslogar presente");
else fail("S8: sem Deslogar");
const cls = (await logoutBtn.getAttribute("class")) || "";
if (cls.includes("btn-iron") && !cls.includes("shield")) ok("S8: retangulo");
else fail("S8: classe " + cls);
await logoutBtn.click();
await page.waitForFunction(
  () => {
    const f = document.querySelector("iframe");
    return !!f && /01-login/.test(f.contentWindow?.location?.href || "");
  },
  null,
  { timeout: 15000 },
);
const sess = await page.evaluate(() => ({
  parent: sessionStorage.getItem("uaidzin_session_v1"),
  active: sessionStorage.getItem("uaidzin_active_char"),
  iframe: (() => {
    try {
      return document.querySelector("iframe")?.contentWindow?.sessionStorage?.getItem("uaidzin_session_v1");
    } catch {
      return "err";
    }
  })(),
}));
if (!sess.parent && !sess.iframe) ok("S8: sessao limpa");
else fail("S8: sessao " + JSON.stringify(sess));
if (!sess.active) ok("S8: active limpo");
else fail("S8: active " + sess.active);

await wipe(page);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(600);
frame = page.frameLocator("iframe").first();
await loginAdmin(page, frame);

await frame.locator("#btnCreateFirst").click();
await frame.locator("#newName").fill("ZeroGold");
await frame.locator("#btnCreateConfirm").click();
await page.waitForTimeout(900);

const loaded = await page.evaluate(async () => {
  const w = document.querySelector("iframe")?.contentWindow;
  const session = JSON.parse(w.sessionStorage.getItem("uaidzin_session_v1"));
  const data = await w.UaidzinSave.loadSave(session);
  return { version: data?.version, slot: (data?.slots || []).find((s) => s && s.name === "ZeroGold") || null };
});
const slot = loaded.slot;
console.log("SLOT", JSON.stringify(loaded));
if (loaded.version === 3 && slot?.saveVersion === 4) ok("C9: conta v3 com resumo v4");
else fail("C9: formato conta " + loaded.version + " resumo " + slot?.saveVersion);
if (slot?.gold === 0) ok("C9: gold 0 create");
else fail("C9: gold " + slot?.gold);
if (slot?.attrs?.FOR === 5 && slot?.attrs?.INT === 5) ok("C9: attrs 5");
else fail("C9: attrs " + JSON.stringify(slot?.attrs));
if (slot?.trees?.controle === 0 && slot?.spec?.fisica === 0) ok("C2: trees/spec 0 create");
else fail("C2: trees/spec " + JSON.stringify({ trees: slot?.trees, spec: slot?.spec }));

await frame.locator("#btnConnect").click();
await page.waitForFunction(
  () => {
    const api = window.__UAIDZIN__;
    return api?.session?.character?.name === "ZeroGold";
  },
  null,
  { timeout: 30000 },
);

const city = await page.evaluate(() => {
  const s = window.__UAIDZIN__.session;
  return {
    name: s.character.name,
    gold: s.inventory.gold,
    attrs: { ...s.character.attributes },
    equip: Object.keys(s.equipment.snapshotEquipped()).filter((k) => s.equipment.equipped[k]),
    learned: Array.from(s.skillTree.state.learned || []),
    loadout: s.skillLoadout.snapshot().length,
  };
});
console.log("CITY", JSON.stringify(city));
if (city.name === "ZeroGold") ok("C5: nome do save na cidade");
else fail("C5: nome " + city.name);
if (city.gold === 0) ok("C9: gold 0 cidade");
else fail("C9: gold cidade " + city.gold);
if (city.attrs.FOR === 5 && city.attrs.DES === 5) ok("C9: attrs 5 cidade");
else fail("C9: attrs cidade " + JSON.stringify(city.attrs));
if (!city.equip.length) ok("C9: equip vazio");
else fail("C9: equip " + JSON.stringify(city.equip));
if (city.learned.length === 0 && city.loadout === 0) ok("C2: skills/loadout 0");
else fail("C2: learned/loadout " + city.learned.length + "/" + city.loadout);

await page.evaluate(async () => {
  const api = window.__UAIDZIN__;
  api.debugAddLevels(3);
  api.learnFirstSkill();
  await api.persistSave(true);
  await api.save?.flush?.();
});
await page.waitForTimeout(400);

const before = await page.evaluate(() => {
  const s = window.__UAIDZIN__.session;
  return {
    learned: Array.from(s.skillTree.state.learned || []),
    gold: s.inventory.gold,
    name: s.character.name,
  };
});
console.log("BEFORE_RELOAD", JSON.stringify(before));
if (before.learned.length > 0) ok("C2: skill alocada");
else fail("C2: nao alocou skill");

await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(
  () => window.__UAIDZIN__?.session?.character?.name === "ZeroGold",
  null,
  { timeout: 30000 },
);
const after = await page.evaluate(() => {
  const s = window.__UAIDZIN__.session;
  return {
    name: s.character.name,
    gold: s.inventory.gold,
    learned: Array.from(s.skillTree.state.learned || []),
  };
});
console.log("AFTER_RELOAD", JSON.stringify(after));
if (after.learned.length > 0) ok("C2: skills sobrevivem reload");
else fail("C2: skills sumiram");
if (after.gold === before.gold) ok("C2: gold estavel no reload");
else fail("C2: gold mudou " + after.gold);

await wipe(page);
const wiped = await page.evaluate(() => ({
  session: sessionStorage.getItem("uaidzin_session_v1"),
  active: sessionStorage.getItem("uaidzin_active_char"),
  accounts: localStorage.getItem("uaidzin_accounts_v1"),
}));
if (!wiped.session && !wiped.active) ok("C5: wipe limpa sessao");
else fail("C5: wipe sessao " + JSON.stringify(wiped));

const bootHtml = await page.goto(BASE + "/boot/02-selecao-personagem.html", {
  waitUntil: "domcontentloaded",
});
const html = await page.content();
if (!html.includes("Bjorn") && html.includes("DEFAULT_SLOTS = [null, null, null, null]")) {
  ok("C5: boot sem mock");
} else if (!html.includes("Bjorn")) {
  ok("C5: boot sem Bjorn");
} else {
  fail("C5: mock Bjorn ainda no boot");
}
void bootHtml;

await browser.close();
console.log(failed ? "RESULT FAIL " + failed : "RESULT PASS");
process.exit(failed ? 1 : 0);
