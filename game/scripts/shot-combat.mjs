import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto("http://127.0.0.1:5173/");
await p.waitForFunction(() => !!window.__UAIDZIN__);
await p.evaluate(() => window.__UAIDZIN__.clearSave());
await p.reload();
await p.waitForFunction(() => !!window.__UAIDZIN__);
await p.waitForTimeout(400);
await p.locator('[data-action="newGame"]').click();
await p.waitForTimeout(200);
await p.locator('.class-card[data-arg="TK"]').click();
await p.waitForTimeout(200);
await p.evaluate(() => window.__UAIDZIN__.enterDungeon());
await p.waitForTimeout(200);
await p.evaluate(() => window.__UAIDZIN__.teleportPlayer(5, -3.2));
await p.waitForTimeout(1800);
await p.screenshot({ path: "docs/compose/combat-feedback.png" });
const fx = await p.evaluate(() => ({
  n: document.querySelectorAll(".dmg-number").length,
  count: window.__UAIDZIN__.getFxCount(),
}));
console.log("screenshot ok", JSON.stringify(fx));
await b.close();
