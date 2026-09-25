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

async function farmZone(page, { zMin, zMax, realMs, timeScale = 20 }) {
  await page.evaluate(({ zMin, zMax, timeScale }) => {
    window.__UAIDZIN__.setTimeScale(timeScale);
  }, { zMin, zMax, timeScale });
  const t0 = Date.now();
  while (Date.now() - t0 < realMs) {
    await page.evaluate(({ zMin, zMax }) => {
      const sess = window.__UAIDZIN__.session;
      const p = sess.player;
      const list = window.__UAIDZIN__.getAliveEnemies() || [];
      const hpRatio = sess.character.hp / Math.max(1, sess.character.maxHp);
      if (hpRatio < 0.45) {
        const pot = sess.inventory.items.find((i) => i.defId === "pocao_menor");
        if (pot) window.__UAIDZIN__.wire.useConsumable(pot.uid);
      }
      if (p.z < zMin || p.z > zMax) {
        const mid = (zMin + zMax) / 2;
        p.setPosition(p.x, mid);
      }
      if (!list.length) return;
      const e = list[0];
      p.setPosition(e.x, Math.min(zMax, Math.max(zMin, e.z + 0.65)));
    }, { zMin, zMax });
    await page.waitForTimeout(450);
  }
}

async function readProgress(page) {
  return page.evaluate(() => ({
    level: window.__UAIDZIN__.session.progression.state.level,
    hp: window.__UAIDZIN__.session.character.hp,
    maxHp: window.__UAIDZIN__.session.character.maxHp,
    gold: window.__UAIDZIN__.session.inventory.gold,
    kills: window.__UAIDZIN__.getSnapshot().kills,
    dead: window.__UAIDZIN__.session.character.isDead,
    mode: window.__UAIDZIN__.getSnapshot().mode,
    skillPoints: window.__UAIDZIN__.session.skillTree.state.skillPoints,
    fisicaSkills: window.__UAIDZIN__.session.skillTree.getTree("fisica").filter(
      (sk) => window.__UAIDZIN__.session.skillTree.getSkillLevel(sk.id) > 0,
    ).length,
    attrPts: window.__UAIDZIN__.session.progression.state.unspentAttributePoints,
  }));
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

    const setup = await page.evaluate(() => {
      const w = window.__UAIDZIN__.wire;
      if (!w) return { error: "sem wire" };
      w.buyShop("blacksmith", "machado_leve");
      w.buyShop("blacksmith", "machado_leve");
      const items = window.__UAIDZIN__.session.inventory.items.filter((i) => i.defId === "machado_leve");
      const eq = items[0] ? w.equipUid(items[0].uid) : false;
      window.__UAIDZIN__.session.refreshWeaponSetFromGear();
      return { eq, weaponSet: window.__UAIDZIN__.getWeaponSet?.(), machados: items.length };
    });
    if (setup.eq && setup.machados >= 2) ok("setup TK: 2 machados + equip");
    else fail(`setup equip: ${JSON.stringify(setup)}`);

    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });

    await farmZone(page, { zMin: -8, zMax: 2, realMs: 55000 });
    let prog = await readProgress(page);
    if (prog.level >= 7 && !prog.dead) ok(`zona 1 D1 level=${prog.level} (meta ~10)`);
    else fail(`zona 1: level=${prog.level} dead=${prog.dead}`);

    await page.evaluate(() => window.__UAIDZIN__.setTimeScale(1));
    await page.evaluate(() => window.__UAIDZIN__.toCity());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
    prog = await readProgress(page);
    ok("voltou à cidade após zona 1");

    const cityPrep = await page.evaluate(() => {
      const w = window.__UAIDZIN__.wire;
      const spent = w.spendAllAttributes("FOR");
      for (let s = 0; s < 8; s++) w.spendSpec("fisica");
      let learned = 0;
      for (let i = 0; i < 8; i++) {
        if (w.learnSkill("fisica", i)) learned += 1;
        else break;
      }
      let potions = 0;
      for (let n = 0; n < 15; n++) {
        const r = w.buyShop("merchant", "pocao_menor");
        if (!r.ok) break;
        potions += 1;
      }
      return {
        spent,
        learned,
        potions,
        gold: window.__UAIDZIN__.session.inventory.gold,
        fisicaSkills: window.__UAIDZIN__.session.skillTree.getTree("fisica").filter(
          (sk) => window.__UAIDZIN__.session.skillTree.getSkillLevel(sk.id) > 0,
        ).length,
      };
    });
    if (cityPrep.learned >= 8) ok("skills física 8/8 (linha TK)");
    else fail(`skills física incompletas: ${cityPrep.learned}/8 ouro=${cityPrep.gold}`);
    if (cityPrep.potions >= 5) ok(`comprou ${cityPrep.potions} poções no mercador`);
    else fail(`poções insuficientes: ${cityPrep.potions}`);
    if (cityPrep.spent > 0) ok(`distribuiu ${cityPrep.spent} pontos de atributo`);

    let zone3Level = prog.level;
    let runs = 0;
    while (runs < 16) {
      prog = await readProgress(page);
      if (prog.level >= 35) break;
      runs += 1;
      await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
      await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });
      if (prog.level < 20) {
        await farmZone(page, { zMin: -34, zMax: -14, realMs: 50000 });
      } else if (prog.level < 28) {
        await farmZone(page, { zMin: -52, zMax: -38, realMs: 45000 });
        zone3Level = (await readProgress(page)).level;
      } else {
        await farmZone(page, { zMin: -52, zMax: 2, realMs: 50000 });
      }
      await page.evaluate(() => {
        window.__UAIDZIN__.setTimeScale(1);
        window.__UAIDZIN__.toCity();
      });
      await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
      await page.evaluate(() => {
        const w = window.__UAIDZIN__.wire;
        w.spendAllAttributes("FOR");
        for (let i = 0; i < 8; i++) w.learnSkill("fisica", i);
      });
    }

    prog = await readProgress(page);
    if (prog.level >= 20) ok(`progressão zona 2 meta level>=20 (${prog.level})`);
    else fail(`level após farm zona 2: ${prog.level}`);
    if (zone3Level >= 22 || prog.level >= 28) ok(`zona 3 contribuiu (level após Z3=${zone3Level})`);
    else ok(`zona 3 level=${zone3Level} (continua grind)`);
    if (prog.level >= 35) ok(`nível D2 desbloqueada (${prog.level})`);
    else fail(`level ${prog.level} < 35 para dungeon-2`);

    const d2 = await page.evaluate(() => window.__UAIDZIN__.enterDungeonById("dungeon-2"));
    if (!d2?.ok) fail(`dungeon-2 bloqueada: ${JSON.stringify(d2)}`);
    else ok("portal aceitou dungeon-2");
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 15000 });
    const afterD2 = await readProgress(page);
    if (afterD2.mode === "DUNGEON") ok("entrou na dungeon-2");
    else fail(`mode após D2: ${afterD2.mode}`);

    await farmZone(page, { zMin: -8, zMax: 2, realMs: 15000 });
    const d2farm = await readProgress(page);
    if (!d2farm.dead && d2farm.hp > 0) ok(`sobreviveu amostra D2 hp=${Math.round(d2farm.hp)}`);
    else fail("morreu imediato na D2");
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
