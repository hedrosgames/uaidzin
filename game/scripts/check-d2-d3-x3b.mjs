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

async function waitMode(page, modes, timeout = 25000) {
  const set = new Set(Array.isArray(modes) ? modes : [modes]);
  await page.waitForFunction(
    (want) => {
      const m = window.__UAIDZIN__?.getSnapshot?.()?.mode;
      return want.includes(m);
    },
    [...set],
    { timeout },
  );
  return page.evaluate(() => window.__UAIDZIN__.getSnapshot());
}

async function fadeOpacity(page) {
  return page.evaluate(() => {
    const el = document.getElementById("uaidzin-scene-fade");
    if (!el) return null;
    return Number(getComputedStyle(el).opacity);
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await wipe(page);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(600);
let frame = page.frameLocator("iframe").first();
await loginAdmin(page, frame);

await frame.locator("#btnCreateFirst").click();
await frame.locator("#newName").fill("MorteTK");
await frame.locator("#btnCreateConfirm").click();
await page.waitForTimeout(900);
await frame.locator("#btnConnect").click();
await page.waitForFunction(() => !!window.__UAIDZIN__?.enterDungeon, null, {
  timeout: 30000,
});
await page.waitForTimeout(1000);

const enter1 = await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
if (!enter1?.ok) fail("X3b enterDungeon " + JSON.stringify(enter1));
else ok("X3b enterDungeon ok");

let sawFade = false;
for (let i = 0; i < 40; i++) {
  const op = await fadeOpacity(page);
  if (op != null && op > 0.2) {
    sawFade = true;
    break;
  }
  await page.waitForTimeout(50);
}
if (sawFade) ok("X3b fade preto na entrada");
else fail("X3b fade preto na entrada nao visto");

await waitMode(page, "DUNGEON", 20000);
await page.waitForTimeout(500);

const kill1 = await page.evaluate(() => window.__UAIDZIN__.forcePlayerDeath());
if (!kill1) fail("D2 forcePlayerDeath 1");
else ok("D2 forcePlayerDeath 1");

const deadSnap = await waitMode(page, "DEAD", 5000);
if (deadSnap.playerDeadPose) ok("D2 pose morte na dungeon");
else fail("D2 pose morte na dungeon");
if (deadSnap.world === "dungeon-test") ok("D2 ainda no mundo dungeon");
else fail("D2 mundo " + deadSnap.world);

sawFade = false;
for (let i = 0; i < 120; i++) {
  const snap = await page.evaluate(() => window.__UAIDZIN__.getSnapshot());
  const op = await fadeOpacity(page);
  if (op != null && op > 0.2) sawFade = true;
  if (snap.mode === "CITY") break;
  await page.waitForTimeout(100);
}
if (sawFade) ok("X3b fade preto na saida por morte");
else fail("X3b fade preto na saida por morte nao visto");

const afterDeath = await waitMode(page, "CITY", 5000);
if (afterDeath.mode === "CITY") ok("D2 teleporte cidade apos morte");
else fail("D2 mode pos-morte " + afterDeath.mode);
if (!afterDeath.playerDeadPose) ok("D2 sem pose morte na cidade");
else fail("D2 ainda deadPose na cidade");
if (afterDeath.deathEmitCount >= 1) ok("D2 deathEmitCount " + afterDeath.deathEmitCount);
else fail("D2 deathEmitCount " + afterDeath.deathEmitCount);

await page.waitForTimeout(600);
const enter2 = await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
if (!enter2?.ok) fail("D3 reenter " + JSON.stringify(enter2));
else ok("D3 reenter dungeon");
await waitMode(page, "DUNGEON", 20000);
await page.waitForTimeout(500);

const before2 = await page.evaluate(() => window.__UAIDZIN__.getSnapshot());
const kill2 = await page.evaluate(() => window.__UAIDZIN__.forcePlayerDeath());
if (!kill2) fail("D3 forcePlayerDeath 2");
else ok("D3 forcePlayerDeath 2");
const dead2 = await waitMode(page, "DEAD", 5000);
if (dead2.playerDeadPose) ok("D3 morte 2 com pose");
else fail("D3 morte 2 sem pose");
if (dead2.deathEmitCount > before2.deathEmitCount) {
  ok("D3 deathEmitCount " + before2.deathEmitCount + " -> " + dead2.deathEmitCount);
} else {
  fail("D3 deathEmitCount nao subiu");
}

const city2 = await waitMode(page, "CITY", 20000);
if (city2.mode === "CITY" && !city2.playerDeadPose) ok("D3 volta cidade limpa");
else fail("D3 city2 " + JSON.stringify({ mode: city2.mode, pose: city2.playerDeadPose }));

await page.waitForTimeout(400);
const enter3 = await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
if (!enter3?.ok) fail("X3b enter 3");
await waitMode(page, "DUNGEON", 15000);
await page.waitForTimeout(400);

sawFade = false;
void page.evaluate(() => window.__UAIDZIN__.toCity());
for (let i = 0; i < 50; i++) {
  const op = await fadeOpacity(page);
  if (op != null && op > 0.15) {
    sawFade = true;
    break;
  }
  await page.waitForTimeout(40);
}
await waitMode(page, "CITY", 15000);
if (sawFade) ok("X3b fade preto saida via toCity");
else fail("X3b fade preto saida via toCity");

await browser.close();
console.log(failed ? "RESULT FAIL " + failed : "RESULT PASS");
process.exit(failed ? 1 : 0);
