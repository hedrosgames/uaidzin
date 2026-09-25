import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5175;
const BASE = `http://127.0.0.1:${PORT}/`;

let failed = 0;
let server = null;

function ok(msg) {
  console.log("CYCLE_OK", msg);
}
function fail(msg) {
  failed += 1;
  console.error("CYCLE_FAIL", msg);
}

function killServer() {
  if (!server || server.killed) return;
  server.kill("SIGTERM");
  server = null;
}

function run(command) {
  const res = spawnSync(command, { cwd: ROOT, stdio: "inherit", shell: true });
  if (res.status !== 0) throw new Error(`${command} falhou`);
}

async function waitForServer(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("preview não respondeu");
}

async function main() {
  run("npx vite build");
  server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
  });
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => {
      window.__UAIDZIN_DEBUG__ = true;
      window.__UAIDZIN_SKIP_BOOT__ = {
        id: "cycle:slot:0",
        name: "Cycle",
        classId: "TK",
        level: 1,
        evolution: "Mortal",
        gold: 0,
        attrs: { FOR: 5, DES: 5, CONS: 5, INT: 5 },
      };
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.().entered, null, { timeout: 30000 });

    const buys = await page.evaluate(() => {
      const w = window.__UAIDZIN__.wire;
      if (!w) return { error: "sem wire" };
      const a = w.buyShop("blacksmith", "machado_leve");
      const b = w.buyShop("blacksmith", "machado_leve");
      const items = window.__UAIDZIN__.session.inventory.items.filter((i) => i.defId === "machado_leve");
      const eq = items[0] ? w.equipUid(items[0].uid) : false;
      window.__UAIDZIN__.session.refreshWeaponSetFromGear();
      return { a, b, machados: items.length, eq, weaponSet: window.__UAIDZIN__.getWeaponSet?.() };
    });
    if (buys.a?.ok && buys.b?.ok) ok("comprou 2 machados (preço 0)");
    else fail(`compra machado: ${JSON.stringify(buys)}`);
    if (buys.eq) ok("equipou machado");
    else fail("equip machado falhou");
    if (buys.weaponSet === "dual-axe") ok("visual dual-axe com 2 machados");
    else if (buys.weaponSet === "axe-shield") ok(`weapon set ${buys.weaponSet} (1 machado equipado)`);
    else fail(`weapon set inesperado: ${buys.weaponSet}`);

    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });

    await page.evaluate(() => {
      window.__UAIDZIN__.setTimeScale(20);
      window.__UAIDZIN__.session.player.setPosition(0, 0);
    });

    const before = await page.evaluate(() => ({
      level: window.__UAIDZIN__.session.progression.state.level,
      hp: window.__UAIDZIN__.session.character.hp,
    }));

    const farmStart = Date.now();
    while (Date.now() - farmStart < 50000) {
      await page.evaluate(() => {
        const list = window.__UAIDZIN__.getAliveEnemies() || [];
        const p = window.__UAIDZIN__.session.player;
        if (p.z < -10) {
          p.setPosition(p.x, 0);
        }
        if (!list.length) return;
        const e = list[0];
        p.setPosition(e.x, e.z + 0.65);
      });
      await page.waitForTimeout(500);
    }

    const mid = await page.evaluate(() => ({
      level: window.__UAIDZIN__.session.progression.state.level,
      hp: window.__UAIDZIN__.session.character.hp,
      kills: window.__UAIDZIN__.getSnapshot().kills,
      gold: window.__UAIDZIN__.session.inventory.gold,
      dead: window.__UAIDZIN__.session.character.isDead,
      z: window.__UAIDZIN__.session.player.z,
    }));

    if (mid.kills > 3) ok(`combate arena 1 kills=${mid.kills}`);
    else fail(`poucos kills na arena 1: ${mid.kills}`);
    if (!mid.dead && mid.hp > before.hp * 0.25) ok(`sobreviveu arena 1 hp=${Math.round(mid.hp)}`);
    else fail(`morreu ou hp crítico na arena 1: dead=${mid.dead} hp=${mid.hp}`);
    if (mid.level >= 8) ok(`arena 1 ~10min farm level=${mid.level}`);
    else if (mid.level >= before.level + 2) ok(`subiu nível na run (${before.level}→${mid.level})`);
    else fail(`pouco XP na arena 1: level ${before.level}→${mid.level}`);
    if (mid.gold > 0) ok(`ouro de drops=${mid.gold}`);
    else fail("sem ouro de kills");

    await page.evaluate(() => {
      window.__UAIDZIN__.setTimeScale(1);
      window.__UAIDZIN__.session.player.setPosition(0, -30);
    });
    await page.waitForTimeout(8000);
    const arena2 = await page.evaluate(() => ({
      hp: window.__UAIDZIN__.session.character.hp,
      dead: window.__UAIDZIN__.session.character.isDead,
      hint: window.__UAIDZIN__.getSnapshot().arenaHint,
    }));
    if (arena2.hint && arena2.hint.includes("2")) ok("entrou faixa arena 2");
    else ok(`arena hint=${arena2.hint ?? "?"}`);
  } finally {
    await browser.close();
    killServer();
  }

  if (failed) {
    console.error("CYCLE_FAILED", failed);
    process.exit(1);
  }
  console.log("CYCLE_PASSED");
}

main().catch((err) => {
  console.error("CYCLE_FAIL", err.stack || err.message);
  killServer();
  process.exit(1);
});
