import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  fs.readFileSync(path.resolve(here, "../src/presentation/player/weapon-set-catalog.json"), "utf8"),
);

const OUT = path.resolve("vfx/evidence/idle-weapons");
fs.mkdirSync(OUT, { recursive: true });

const CLASSES = Object.keys(catalog.classDefault);
const SETS = catalog.ids;

async function openGame(page, base) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForFunction(() => typeof window.__UAIDZIN__?.skipToGame === "function");
  await page.evaluate(() => {
    try {
      window.__UAIDZIN__.login?.("admin", "admin");
    } catch {}
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__UAIDZIN__.skipToGame());
  await page.waitForFunction(() => window.__UAIDZIN__?.getSnapshot?.()?.entered === true);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(90000);

let base = "http://127.0.0.1:5174";
try {
  await openGame(page, base);
} catch {
  base = "http://127.0.0.1:5173";
  await openGame(page, base);
}

const failures = [];
const rows = [];

for (const cls of CLASSES) {
  await page.evaluate((id) => window.__UAIDZIN__.setClass(id), cls);
  await page.evaluate(() => window.__UAIDZIN__.skipToGame());
  await page.waitForTimeout(1600);

  for (const set of SETS) {
    await page.evaluate((id) => window.__UAIDZIN__.setWeaponSet(id), set);
    await page.waitForTimeout(650);
    const probe = await page.evaluate(() => window.__UAIDZIN__.getCombatAnimProbe());
    const want = catalog.sets[set];
    const row = {
      cls,
      set,
      weaponSet: probe?.weaponSet ?? null,
      attackClipId: probe?.attackClipId ?? null,
      idleClipId: probe?.idleClipId ?? null,
      basicAnim: probe?.basicAnim ?? null,
      attackReady: !!probe?.attackActionReady,
    };
    rows.push(row);

    if (row.weaponSet !== set) failures.push(`${cls}/${set}: weaponSet=${row.weaponSet}`);
    if (row.attackClipId !== want.attackClip) {
      failures.push(`${cls}/${set}: attack=${row.attackClipId} want ${want.attackClip}`);
    }
    if (row.idleClipId !== want.idle) {
      failures.push(`${cls}/${set}: idle=${row.idleClipId} want ${want.idle}`);
    }
    if (row.basicAnim !== want.basicAnim) {
      failures.push(`${cls}/${set}: basicAnim=${row.basicAnim} want ${want.basicAnim}`);
    }
    if (!row.attackReady) failures.push(`${cls}/${set}: attack not ready`);
  }
}

fs.writeFileSync(path.join(OUT, "matrix-report.json"), JSON.stringify({ base, rows, failures }, null, 2));
console.log(JSON.stringify({ base, rows: rows.length, failures }, null, 2));
await browser.close();
if (failures.length) process.exit(1);
