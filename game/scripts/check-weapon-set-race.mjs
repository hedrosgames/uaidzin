import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("RACE_OK", m);
const fail = (m) => {
  failed += 1;
  console.error("RACE_FAIL", m);
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("PAGE_ERROR", err));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("CONSOLE_ERROR", msg.text());
    });

    await page.addInitScript(() => {
      window.__UAIDZIN_SKIP_BOOT__ = {
        id: "race:slot:0",
        name: "Race",
        classId: "TK",
        level: 1,
        evolution: "Mortal",
        gold: 100,
        attrs: { FOR: 10, DES: 10, CONS: 10, INT: 10 },
      };
    });

    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.()?.entered, null, {
      timeout: 30000,
    });
    ok("jogo iniciado e pronto");

    const client = await context.newCDPSession(page);
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 120,
      downloadThroughput: 150 * 1024,
      uploadThroughput: 150 * 1024,
    });

    const setsA = ["sword-shield", "greatsword", "dual-sword", "bow", "greatsword"];
    await page.evaluate((targetSets) => {
      for (const s of targetSets) {
        window.__UAIDZIN__.setWeaponSet(s);
      }
    }, setsA);

    await page.waitForFunction(
      () => window.__UAIDZIN__.getWeaponRigSet() === "greatsword",
      null,
      { timeout: 30000 },
    );

    const resA = await page.evaluate(() => ({
      weaponSet: window.__UAIDZIN__.getWeaponSet(),
      rigSet: window.__UAIDZIN__.getWeaponRigSet(),
    }));

    if (resA.rigSet === resA.weaponSet && resA.rigSet === "greatsword") {
      ok(`round 1 resolvido corretamente: rig=${resA.rigSet} set=${resA.weaponSet}`);
    } else {
      fail(`round 1 inconsistente: rig=${resA.rigSet} set=${resA.weaponSet} esperado="greatsword"`);
    }

    const setsB = ["bow", "sword-shield", "greatsword", "staff", "dual-sword"];
    await page.evaluate((targetSets) => {
      for (const s of targetSets) {
        window.__UAIDZIN__.setWeaponSet(s);
      }
    }, setsB);

    await page.waitForFunction(
      () => window.__UAIDZIN__.getWeaponRigSet() === "dual-sword",
      null,
      { timeout: 30000 },
    );

    const resB = await page.evaluate(() => ({
      weaponSet: window.__UAIDZIN__.getWeaponSet(),
      rigSet: window.__UAIDZIN__.getWeaponRigSet(),
    }));

    if (resB.rigSet === resB.weaponSet && resB.rigSet === "dual-sword") {
      ok(`round 2 resolvido corretamente: rig=${resB.rigSet} set=${resB.weaponSet}`);
    } else {
      fail(`round 2 inconsistente: rig=${resB.rigSet} set=${resB.weaponSet} esperado="dual-sword"`);
    }

  } catch (err) {
    fail(`exceção no teste: ${String(err)}`);
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

void run();
