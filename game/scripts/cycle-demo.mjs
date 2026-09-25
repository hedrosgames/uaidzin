import { chromium } from "playwright";

const BASE = process.env.CYCLE_DEMO_URL || "http://127.0.0.1:5173/";

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => {
      window.__UAIDZIN_DEBUG__ = true;
    });
    await page.goto(`${BASE}tools/save-wipe.html?auto=all`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const frame = page.frameLocator("iframe").first();
    await frame.locator("#user").fill("admin");
    await frame.locator("#pass").fill("admin");
    await frame.locator("#btnLogin").click();
    await page.waitForTimeout(1200);
    await frame.locator("#btnCreateFirst").click();
    await frame.locator("#newName").fill("DemoTK");
    await frame.locator("#btnCreateConfirm").click();
    await page.waitForTimeout(900);
    await frame.locator("#btnConnect").click();
    await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.().entered, null, {
      timeout: 30000,
    });
    await page.waitForTimeout(800);
    const setup = await page.evaluate(() => {
      const w = window.__UAIDZIN__.wire;
      w.buyShop("blacksmith", "machado_leve");
      w.buyShop("blacksmith", "machado_leve");
      const items = window.__UAIDZIN__.session.inventory.items.filter((i) => i.defId === "machado_leve");
      if (items[0]) w.equipUid(items[0].uid);
      window.__UAIDZIN__.session.refreshWeaponSetFromGear();
      return {
        weaponSet: window.__UAIDZIN__.getWeaponSet?.(),
        machados: items.length,
      };
    });
    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, {
      timeout: 15000,
    });
    const probe = { ...setup, mode: "DUNGEON" };
    await page.evaluate(() => window.__UAIDZIN__.setTimeScale(10));
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => {
        const s = window.__UAIDZIN__.session;
        const list = window.__UAIDZIN__.getAliveEnemies() || [];
        if (list.length) {
          const e = list[0];
          s.player.setPosition(e.x, e.z + 0.65);
        }
      });
      await page.waitForTimeout(350);
    }
    const end = await page.evaluate(() => ({
      weaponSet: window.__UAIDZIN__.getWeaponSet?.(),
      swings: window.__UAIDZIN__.getSnapshot().autoAttackSwings,
      anim: window.__UAIDZIN__.getCombatAnimProbe(),
      level: window.__UAIDZIN__.getSnapshot().level,
      kills: window.__UAIDZIN__.getSnapshot().kills,
      hp: window.__UAIDZIN__.session.character.hp,
      maxHp: window.__UAIDZIN__.session.character.maxHp,
    }));
    const ok =
      probe.weaponSet === "dual-axe" &&
      probe.machados >= 2 &&
      end.swings >= 3 &&
      end.anim?.attackClipId === "attack_1h" &&
      end.kills >= 1;
    console.log("CYCLE_DEMO", JSON.stringify({ probe, end, ok }));
    if (!ok) process.exit(1);
    console.log("CYCLE_DEMO_PASSED");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CYCLE_DEMO_FAIL", err.stack || err.message);
  process.exit(1);
});
