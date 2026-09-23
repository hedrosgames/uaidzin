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

await frame.locator("#btnCreateFirst").click();
await frame.locator("#newName").fill("CavTK");
await frame.locator("#btnCreateConfirm").click();
await page.waitForTimeout(900);

const slot = await page.evaluate(async () => {
  const w = document.querySelector("iframe")?.contentWindow;
  const session = JSON.parse(w.sessionStorage.getItem("uaidzin_session_v1"));
  const data = await w.UaidzinSave.loadSave(session);
  return (data?.slots || []).find((s) => s && s.name === "CavTK") || null;
});
console.log("SLOT", JSON.stringify(slot));
if (slot?.classId === "TK") ok("C4: slot classId TK");
else fail("C4: slot classId " + slot?.classId);
if (slot?.attrs?.FOR === 5 && slot?.attrs?.DES === 5) ok("C3: slot attrs 5");
else fail("C3: slot attrs " + JSON.stringify(slot?.attrs));
if (slot?.gold === 0) ok("C3: slot gold 0");
else fail("C3: slot gold " + slot?.gold);

await frame.locator("#btnConnect").click();
await page.waitForFunction(
  () => {
    const api = window.__UAIDZIN__;
    return api?.session?.character?.name === "CavTK";
  },
  null,
  { timeout: 30000 },
);
await page.waitForTimeout(1200);

const city = await page.evaluate(() => {
  const api = window.__UAIDZIN__;
  const s = api?.session;
  const wire = document.querySelector("#wire-ui");
  const personClass = wire?.querySelector('#p-person [data-bind="class"]')?.textContent?.trim();
  const skillsClass = wire?.querySelector('#p-skills [data-bind="class"]')?.textContent?.trim();
  const personName = wire?.querySelector('#p-person [data-bind="name"]')?.textContent?.trim();
  const personLevel = wire?.querySelector('#p-person [data-bind="level"]')?.textContent?.trim();
  const forVal = wire?.querySelector('#attr-list [data-attr="FOR"]')?.textContent?.trim();
  const desVal = wire?.querySelector('#attr-list [data-attr="DES"]')?.textContent?.trim();
  const gold = wire?.querySelector("#playerGold")?.textContent?.trim();
  const face = wire?.querySelector("#p-person .face img")?.getAttribute("src") || "";
  const hudName = document.getElementById("player-name")?.textContent?.trim();
  const hudFace = document.querySelector("#player-face, .player-face, img#playerFace")?.getAttribute("src")
    || document.querySelector(".player-frame img, #player-frame img")?.getAttribute("src")
    || "";
  return {
    sessionClass: s?.skillTree?.state?.classId,
    sessionName: s?.character?.name,
    sessionAttrs: s?.character?.attributes ? { ...s.character.attributes } : null,
    sessionGold: s?.inventory?.gold,
    personClass,
    skillsClass,
    personName,
    personLevel,
    forVal,
    desVal,
    gold,
    face,
    hudName,
    hudFace,
    huntressLeft: !!(wire?.textContent || "").match(/\bHuntress\b/),
  };
});
console.log("CITY", JSON.stringify(city));

if (city.sessionClass === "TK") ok("C4: session classId TK");
else fail("C4: session classId " + city.sessionClass);
if (city.personClass === "Thegn Knight") ok("C4: person class Thegn Knight");
else fail("C4: person class " + city.personClass);
if (city.skillsClass === "Thegn Knight") ok("C4: skills class Thegn Knight");
else fail("C4: skills class " + city.skillsClass);
if (!city.huntressLeft || city.personClass === "Huntress") {
  if (city.personClass !== "Huntress" && city.skillsClass !== "Huntress") {
    ok("C4: painéis sem label Huntress no personagem");
  } else fail("C4: Huntress ainda no painel");
} else {
  ok("C4: Huntress só em texto de lore (se houver)");
}

if (city.personName === "CavTK") ok("C3: nome do painel = save");
else fail("C3: nome " + city.personName);
if (city.personLevel === "1") ok("C3: nivel 1");
else fail("C3: nivel " + city.personLevel);
if (city.forVal === "5" && city.desVal === "5") ok("C3: attrs painel 5");
else fail("C3: attrs painel " + city.forVal + "/" + city.desVal);
if (city.sessionAttrs?.FOR === 5) ok("C3: attrs sessao 5");
else fail("C3: attrs sessao " + JSON.stringify(city.sessionAttrs));
if (String(city.gold).replace(/\D/g, "") === "0" || city.gold === "0") ok("C3: gold painel 0");
else fail("C3: gold painel " + city.gold);
if (city.face.includes("face-tk")) ok("C3: face TK");
else fail("C3: face " + city.face);
if (city.hudName === "CavTK") ok("C3: HUD nome");
else fail("C3: HUD nome " + city.hudName);

await page.keyboard.press("KeyC");
await page.waitForTimeout(400);
const openPerson = await page.evaluate(() => {
  const win = document.querySelector("#wire-ui #p-person");
  return {
    open: !!win && !win.classList.contains("is-closed"),
    classLabel: win?.querySelector('[data-bind="class"]')?.textContent?.trim(),
    name: win?.querySelector('[data-bind="name"]')?.textContent?.trim(),
  };
});
console.log("OPEN_C", JSON.stringify(openPerson));
if (openPerson.open && openPerson.classLabel === "Thegn Knight") ok("C4: C aberto Thegn Knight");
else fail("C4: C aberto " + JSON.stringify(openPerson));

await browser.close();
if (failed) {
  console.error("FAILED", failed);
  process.exit(1);
}
console.log("ALL_OK");
