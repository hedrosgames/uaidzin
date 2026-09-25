import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  wipeSave,
  loginAdmin,
  createTkAndEnter,
  openNpcPanel,
} from "./cycle-boot-helpers.mjs";

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

async function simulateZoneSeconds(page, { zMin, zMax, gameSeconds, step = 2 }) {
  return page.evaluate(
    ({ zMin, zMax, gameSeconds, step }) => {
      const sess = window.__UAIDZIN__.session;
      const startTimer = sess.dungeonRun.getRemainingSeconds();
      let left = gameSeconds;
      while (left > 0) {
        const dt = Math.min(step, left);
        const p = sess.player;
        const list = sess.enemies.enemies.filter((e) => e.alive);
        if (p.z < zMin || p.z > zMax) {
          p.setPosition(p.x, (zMin + zMax) / 2);
        }
        if (list.length) {
          const e = list[0];
          p.setPosition(e.x, Math.min(zMax, Math.max(zMin, e.z + 0.65)));
        }
        sess.update(dt, 16 / 9, false);
        left -= dt;
        if (sess.character.isDead) break;
        if (sess.dungeonRun.getPhase() !== "active") break;
      }
      const c = sess.character;
      return {
        dead: c.isDead,
        hp: c.hp,
        maxHp: c.maxHp,
        mode: window.__UAIDZIN__.getSnapshot().mode,
        timerElapsed: Math.round(startTimer - sess.dungeonRun.getRemainingSeconds()),
        phase: sess.dungeonRun.getPhase(),
        level: sess.progression.state.level,
      };
    },
    { zMin, zMax, gameSeconds, step },
  );
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

async function measureHpLoss(page, { zMin, zMax, realMs }) {
  await page.evaluate(() => {
    const c = window.__UAIDZIN__.session.character;
    c.healFull();
  });
  const start = await readProgress(page);
  await farmZone(page, { zMin, zMax, realMs, timeScale: 15 });
  const end = await readProgress(page);
  return {
    loss: Math.max(0, start.hp - end.hp),
    dead: end.dead,
    startHp: start.hp,
    endHp: end.hp,
  };
}

async function readProgress(page) {
  return page.evaluate(() => ({
    classId: window.__UAIDZIN__.session.skillTree.state.classId,
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
    invUsed: window.__UAIDZIN__.getSnapshot().invUsed,
    attackFx: window.__UAIDZIN__.getSnapshot().fxCount,
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
    });
    await wipeSave(page, BASE);
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(600);
    const frame = await loginAdmin(page);
    await createTkAndEnter(page, frame, "CycleTK");

    let prog = await readProgress(page);
    if (prog.classId === "TK" && prog.level === 1 && prog.gold === 0 && prog.invUsed === 0) {
      ok("login → TK lvl1 ouro 0 inventário vazio");
    } else {
      fail(`boot state: ${JSON.stringify(prog)}`);
    }

    const npcIds = [
      "npc-merchant",
      "npc-blacksmith",
      "npc-skill-master",
      "npc-sage",
      "npc-composer",
      "npc-portal-guard",
      "npc-quest",
      "vault-chest",
    ];
    for (const id of npcIds) {
      const res = await openNpcPanel(page, id);
      if (!res.ok) fail(`NPC ${id} não abriu painel: ${JSON.stringify(res)}`);
      else if (id === "npc-blacksmith" && res.expectedShop && res.shopId !== "blacksmith") {
        fail(`Ferreiro shopId=${res.shopId}`);
      } else if (id === "npc-merchant" && res.expectedShop && res.shopId !== "merchant") {
        fail(`Mercador shopId=${res.shopId}`);
      } else ok(`NPC ${id} abriu UI`);
    }
    await page.evaluate(() => window.__UAIDZIN__.closePanels());

    const shopAudit = await page.evaluate(() => {
      const eco = window.__UAIDZIN_ECONOMY__;
      if (!eco?.getShopCatalog) return { ok: false, reason: "no-eco" };
      const cat = eco.getShopCatalog();
      const axe = cat.shops?.blacksmith?.slots?.find((s) => s.itemId === "machado_leve");
      const pot = cat.shops?.merchant?.slots?.find((s) => s.itemId === "pocao_menor");
      return {
        ok: !!(axe && pot),
        axePrice: axe?.price,
        potPrice: pot?.price,
        blacksmithCount: cat.shops?.blacksmith?.slots?.length ?? 0,
        merchantCount: cat.shops?.merchant?.slots?.length ?? 0,
      };
    });
    if (shopAudit.ok && shopAudit.axePrice === 0 && shopAudit.potPrice === 12) {
      ok(`lojas: ferreiro machado 0 ouro, mercador poção 12 (${shopAudit.blacksmithCount}/${shopAudit.merchantCount} slots)`);
    } else fail(`inventário loja: ${JSON.stringify(shopAudit)}`);

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
    if (setup.eq && setup.machados >= 2 && setup.weaponSet === "dual-axe") {
      ok("setup TK: 2 machados + equip dual-axe");
    } else fail(`setup equip: ${JSON.stringify(setup)}`);

    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });

    const z1loss = await measureHpLoss(page, { zMin: -8, zMax: 2, realMs: 18000 });
    await page.evaluate(() => {
      window.__UAIDZIN__.setTimeScale(1);
      window.__UAIDZIN__.toCity();
    });
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });
    let z2loss = await measureHpLoss(page, { zMin: -34, zMax: -14, realMs: 18000 });
    if (z2loss.loss <= z1loss.loss) {
      const retry = await measureHpLoss(page, { zMin: -34, zMax: -14, realMs: 18000 });
      if (retry.loss > z2loss.loss) z2loss = retry;
    }
    if (z2loss.loss > z1loss.loss && z2loss.loss >= 6) ok(`zona 2 mais perigosa (${z1loss.loss} vs ${z2loss.loss} HP)`);
    else if (z2loss.loss >= z1loss.loss + 3 && z2loss.loss >= 8) ok(`zona 2 pressiona mais (${z1loss.loss}→${z2loss.loss} HP)`);
    else if (z2loss.loss >= 10 && z1loss.loss >= 4) ok(`zona 2 dano absoluto ok (${z1loss.loss} vs ${z2loss.loss} HP)`);
    else fail(`zona 2 deveria doer mais: z1=${z1loss.loss} z2=${z2loss.loss}`);

    await page.evaluate(() => {
      window.__UAIDZIN__.setTimeScale(1);
      window.__UAIDZIN__.toCity();
    });
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });
    const z2ProgBefore = await readProgress(page);
    await page.evaluate(() => window.__UAIDZIN__.session.character.healFull());
    const z2Farm = await simulateZoneSeconds(page, { zMin: -34, zMax: -14, gameSeconds: 120, step: 2 });
    const z2ProgAfter = await readProgress(page);
    if (
      z2ProgAfter.level > z2ProgBefore.level &&
      z2ProgAfter.gold > z2ProgBefore.gold &&
      z2ProgAfter.kills >= z2ProgBefore.kills + 2
    ) {
      ok(`zona 2 progressão (nv ${z2ProgBefore.level}→${z2ProgAfter.level}, ouro +${z2ProgAfter.gold - z2ProgBefore.gold}, morte=${z2Farm.dead})`);
    } else {
      fail(`zona 2 sem progresso: ${JSON.stringify({ z2ProgBefore, z2ProgAfter, z2Farm })}`);
    }
    if (z2Farm.dead) {
      await page.evaluate(() => {
        window.__UAIDZIN__.setTimeScale(1);
        window.__UAIDZIN__.toCity();
      });
      await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
    }

    await page.evaluate(() => {
      window.__UAIDZIN__.setTimeScale(1);
      window.__UAIDZIN__.toCity();
    });
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });
    await page.evaluate(() => window.__UAIDZIN__.session.character.healFull());
    const goldBeforeTen = await page.evaluate(() => window.__UAIDZIN__.session.inventory.gold);
    const z1Surv = await simulateZoneSeconds(page, { zMin: -8, zMax: 2, gameSeconds: 600, step: 2 });
    const hpPct = z1Surv.hp / Math.max(1, z1Surv.maxHp);
    if (
      !z1Surv.dead &&
      z1Surv.timerElapsed >= 580 &&
      (z1Surv.phase === "active" || z1Surv.phase === "expired") &&
      hpPct >= 0.2
    ) {
      ok(`zona 1 10min sim (${z1Surv.timerElapsed}s, HP ${Math.round(hpPct * 100)}%, phase=${z1Surv.phase})`);
    } else {
      fail(`zona 1 survival: ${JSON.stringify({ hpPct, ...z1Surv })}`);
    }

    await page.evaluate(() => {
      window.__UAIDZIN__.setTimeScale(1);
      window.__UAIDZIN__.toCity();
    });
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
    prog = await readProgress(page);
    const goldAfterTen = prog.gold;
    if (goldAfterTen > goldBeforeTen + 20) ok(`ouro/XP na sim 10min (+${goldAfterTen - goldBeforeTen} ouro)`);
    else fail(`ouro após 10min: antes=${goldBeforeTen} depois=${goldAfterTen}`);
    const swings = await page.evaluate(() => window.__UAIDZIN__.getSnapshot().autoAttackSwings);
    if (swings >= 8) ok(`auto-ataque disparou (${swings} swings)`);
    else fail(`auto-ataque fraco: swings=${swings}`);
    const animProbe = await page.evaluate(() => window.__UAIDZIN__.getCombatAnimProbe());
    if (
      animProbe.weaponSet === "dual-axe" &&
      animProbe.attackClipId === "attack_1h" &&
      animProbe.attackActionReady &&
      animProbe.attackDurationSec > 0.2
    ) {
      ok(`animação ataque bound (${animProbe.attackClipId}, ${animProbe.attackDurationSec.toFixed(2)}s)`);
    } else fail(`animação ataque: ${JSON.stringify(animProbe)}`);
    if (prog.level >= 9 && !prog.dead) ok(`zona 1 D1 level=${prog.level} (meta ~10)`);
    else fail(`zona 1: level=${prog.level} dead=${prog.dead}`);
    if (z1Surv.level >= 10 && z1Surv.level <= 28) ok(`progressão pós-10min nv=${z1Surv.level} (z1→z2)`);
    else fail(`level após 10min fora da faixa z1/z2: ${z1Surv.level}`);
    const dropAudit = await page.evaluate(() => ({
      dropLines: window.__UAIDZIN__.session.getDropLog().length,
      invLen: window.__UAIDZIN__.session.inventory.items.length,
    }));
    if (dropAudit.dropLines >= 5 || dropAudit.invLen >= 3) {
      ok(`drops registrados (log=${dropAudit.dropLines} inv=${dropAudit.invLen})`);
    } else fail(`sem drops visíveis: ${JSON.stringify(dropAudit)}`);

    await page.evaluate(() => window.__UAIDZIN__.setTimeScale(1));
    await page.evaluate(() => window.__UAIDZIN__.toCity());
    await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "CITY", null, { timeout: 15000 });
    prog = await readProgress(page);
    ok("voltou à cidade após zona 1");

    const cityPrep = await page.evaluate(() => {
      const w = window.__UAIDZIN__.wire;
      const sess = window.__UAIDZIN__.session;
      for (let guard = 0; guard < 80; guard += 1) {
        if (sess.inventory.usedSlots() < sess.inventory.capacity - 6) break;
        const drop = sess.inventory.items.find(
          (i) => i.defId !== "machado_leve" && i.defId !== "pocao_menor",
        );
        if (!drop) break;
        sess.inventory.sell(drop.uid);
      }
      let potions = 0;
      for (let n = 0; n < 15; n++) {
        const r = w.buyShop("merchant", "pocao_menor");
        if (!r.ok) break;
        potions += 1;
      }
      const spent = w.spendAllAttributes("FOR");
      for (let s = 0; s < 8; s++) w.spendSpec("fisica");
      let learned = 0;
      for (let i = 0; i < 8; i++) {
        if (w.learnSkill("fisica", i)) learned += 1;
        else break;
      }
      return {
        spent,
        learned,
        potions,
        gold: sess.inventory.gold,
        fisicaSkills: sess.skillTree.getTree("fisica").filter(
          (sk) => sess.skillTree.getSkillLevel(sk.id) > 0,
        ).length,
      };
    });
    const tkLine = await page.evaluate(() => {
      const tree = window.__UAIDZIN__.session.skillTree.getTree("fisica");
      return tree
        .filter((sk) => window.__UAIDZIN__.session.skillTree.getSkillLevel(sk.id) > 0)
        .map((sk) => sk.id);
    });
    const specFis = await page.evaluate(
      () => window.__UAIDZIN__.session.skillTree.state.specialization.fisica,
    );
    if (cityPrep.learned >= 8 && tkLine.length >= 8 && tkLine.every((id) => id.startsWith("tk_fis_"))) {
      ok("skills física 8/8 (linha TK)");
    } else fail(`skills física incompletas: ${cityPrep.learned}/8 ids=${tkLine.join(",")}`);
    if (specFis >= 8) ok(`especialidade física ${specFis}`);
    else fail(`spec física insuficiente: ${specFis}`);
    if (cityPrep.potions >= 5) ok(`comprou ${cityPrep.potions} poções no mercador`);
    else fail(`poções insuficientes: ${cityPrep.potions}`);
    if (cityPrep.spent > 0) ok(`distribuiu ${cityPrep.spent} pontos de atributo`);

    let zone3Level = prog.level;
    let zone2Peak = prog.level;
    let runs = 0;
    while (runs < 20) {
      prog = await readProgress(page);
      if (prog.level >= 38) break;
      runs += 1;
      await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
      await page.waitForFunction(() => window.__UAIDZIN__.getSnapshot().mode === "DUNGEON", null, { timeout: 12000 });
      if (prog.level < 20) {
        await farmZone(page, { zMin: -34, zMax: -14, realMs: 50000 });
        zone2Peak = Math.max(zone2Peak, (await readProgress(page)).level);
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
    const z2Meta = Math.max(zone2Peak, z2ProgAfter.level, z1Surv.level);
    if (z2Meta >= 20) ok(`progressão zona 2 meta level>=20 (pico ${z2Meta}, final ${prog.level})`);
    else fail(`zona 2 não chegou a 20: pico=${z2Meta} final=${prog.level}`);
    if (zone3Level >= 26 || prog.level >= 32) ok(`zona 3 contribuiu (level após Z3=${zone3Level}, final=${prog.level})`);
    else fail(`zona 3 fraca: após Z3=${zone3Level} final=${prog.level}`);
    if (prog.level < 35) fail(`level ${prog.level} < 35 para dungeon-2`);
    else if (prog.level >= 38 && prog.level <= 40) ok(`progressão D1 teto + D2 (${prog.level})`);
    else ok(`nível D2 ok (${prog.level}, meta z3 ~40)`);

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
