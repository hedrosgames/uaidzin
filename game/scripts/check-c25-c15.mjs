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
await frame.locator("#newName").fill("FonteNpc");
await frame.locator("#btnCreateConfirm").click();
await page.waitForTimeout(900);
await frame.locator("#btnConnect").click();
await page.waitForFunction(
  () => window.__UAIDZIN__?.session?.character?.name === "FonteNpc",
  null,
  { timeout: 30000 },
);
await page.waitForTimeout(1000);

const c25 = await page.evaluate(() => {
  const api = window.__UAIDZIN__;
  const s = api.session;
  const world = s.worlds.getCurrent();
  api.teleportPlayer(0, 4);
  s.player.setMoveTarget(0, 0);
  for (let i = 0; i < 240; i++) {
    s.player.update(1 / 60, 0, 0, world.boundary, world.collision);
  }
  const dist = Math.hypot(s.player.x, s.player.z);
  const fountain = world.collision.circles.find((c) => c.x === 0 && c.z === 0 && c.r > 1);
  const box = world.collision.boxes.find(
    (b) => b.minX < 0 && b.maxX > 0 && b.minZ < 0 && b.maxZ > 0 && Math.abs(b.maxX - b.minX) < 6,
  );
  return {
    dist,
    x: s.player.x,
    z: s.player.z,
    fountainR: fountain?.r ?? null,
    hasBox: !!box,
    insideCircle: fountain
      ? Math.hypot(s.player.x - fountain.x, s.player.z - fountain.z) < fountain.r
      : null,
  };
});
console.log("C25", JSON.stringify(c25));
if (c25.fountainR && c25.fountainR > 1.5) ok("C25: colisor circular da fonte presente");
else fail("C25: fountainR " + c25.fountainR);
if (c25.hasBox) ok("C25: caixa AABB da fonte presente");
else fail("C25: caixa da fonte ausente");
if (c25.dist >= 2.0 && !c25.insideCircle) ok("C25: player parado fora da fonte dist=" + c25.dist.toFixed(2));
else fail("C25: player invadiu fonte " + JSON.stringify(c25));

const c15 = await page.evaluate(async () => {
  const api = window.__UAIDZIN__;
  const s = api.session;
  api.closePanels();
  api.teleportPlayer(0, 4);
  const sage = s.worlds.getCurrent().interactables.find((i) => i.id === "npc-sage");
  if (!sage) return { error: "no-sage" };
  const startDist = Math.hypot(s.player.x - sage.x, s.player.z - sage.z);
  api.queueInteractById("npc-sage");
  for (let i = 0; i < 360; i++) {
    s.update(1 / 60, 16 / 9, false);
  }
  await new Promise((r) => setTimeout(r, 200));
  const endDist = Math.hypot(s.player.x - sage.x, s.player.z - sage.z);
  const wire = document.querySelector("#wire-ui");
  const sageOpen = !!wire?.querySelector("#p-sage:not(.is-closed)");
  const panels = api.getSnapshot().panelsOpen;
  return { startDist, endDist, sageOpen, panels, px: s.player.x, pz: s.player.z };
});
console.log("C15", JSON.stringify(c15));
if (c15.error) fail("C15: " + c15.error);
else if (c15.startDist > 1.6 && c15.endDist <= 1.6 && (c15.sageOpen || c15.panels)) {
  ok("C15: andou e abriu UI ao chegar start=" + c15.startDist.toFixed(2) + " end=" + c15.endDist.toFixed(2));
} else {
  fail("C15: " + JSON.stringify(c15));
}

await browser.close();
process.exit(failed ? 1 : 0);
