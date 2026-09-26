import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("vfx/evidence/idle-weapons");
fs.mkdirSync(OUT, { recursive: true });

const SETS = ["greatsword", "greatstaff"];

async function pickBase() {
  for (const port of [5175, 5174, 5173]) {
    const url = `http://127.0.0.1:${port}/`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (res.ok) return url;
    } catch {
    }
  }
  return "http://127.0.0.1:5173/";
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);

const base = await pickBase();
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForFunction(() => typeof window.__UAIDZIN__?.skipToGame === "function");
await page.evaluate(() => {
  try {
    window.__UAIDZIN__.login?.("admin", "admin");
  } catch {}
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__UAIDZIN__.skipToGame());
await page.waitForFunction(() => window.__UAIDZIN__?.getSnapshot?.()?.entered === true, null, {
  timeout: 60000,
});
await page.waitForTimeout(2500);
await page.evaluate(() => {
  document.querySelectorAll("iframe").forEach((f) => f.remove());
});

const canvas = page.locator("#game-canvas");
await canvas.waitFor({ state: "visible", timeout: 30000 });

for (const set of SETS) {
  await page.evaluate((id) => window.__UAIDZIN__.setWeaponSet(id), set);
  await page.waitForTimeout(1200);
  const snap = await page.evaluate(() => window.__UAIDZIN__.getSnapshot());
  const setNow = await page.evaluate(() => window.__UAIDZIN__.getWeaponSet());
  if (!snap?.entered || setNow !== set) {
    throw new Error(`not in game for ${set} entered=${snap?.entered} set=${setNow}`);
  }
  await canvas.screenshot({ path: path.join(OUT, `2h-${set}.png`) });
}

await browser.close();
console.log("ok", SETS.join(", "));
