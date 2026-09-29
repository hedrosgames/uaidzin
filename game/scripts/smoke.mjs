/**
 * Smoke test do UAIDZIN — sobe o servidor dev sozinho, roda um ciclo cidade→dungeon→combate→save→cidade.
 * Uso: npm run smoke
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5174;
const BASE = `http://127.0.0.1:${PORT}/`;
const GLOBAL_TIMEOUT_MS = 6 * 60 * 1000;

let failed = 0;
let pageErrors = 0;
let server = null;

function ok(msg) {
  console.log("SMOKE_OK", msg);
}
function fail(msg) {
  failed += 1;
  console.error("SMOKE_FAIL", msg);
}

function killServer() {
  if (!server || server.killed) return;
  if (process.platform === "win32" && server.pid) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGTERM");
  }
  server = null;
}

const globalTimer = setTimeout(() => {
  console.error("SMOKE_FAIL timeout global de 6min estourado");
  killServer();
  process.exit(1);
}, GLOBAL_TIMEOUT_MS);
globalTimer.unref();

async function waitForServer(timeoutMs = 60000) {
  const t0 = Date.now();
  let lastErr = "sem resposta";
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: "GET" });
      if (res.ok) return;
      lastErr = `HTTP ${res.status}`;
    } catch (err) {
      lastErr = err.message;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`servidor dev não respondeu em ${timeoutMs}ms na porta ${PORT}: ${lastErr}`);
}

function startServer() {
  server = spawn(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "vite", "bin", "vite.js"),
      "--port",
      String(PORT),
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    {
      cwd: ROOT,
      stdio: "ignore",
    },
  );
  server.on("error", (err) => {
    console.error("SMOKE_FAIL servidor dev não iniciou:", err.message);
  });
}

async function main() {
  startServer();
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", (err) => {
      pageErrors += 1;
      console.error("SMOKE_PAGEERROR", err.message);
    });

    const snap = () => page.evaluate(() => window.__UAIDZIN__.getSnapshot());
    const waitApi = async () => {
      await page.waitForFunction(() => !!window.__UAIDZIN__, null, { timeout: 30000 });
      await page.waitForFunction(() => !!window.__UAIDZIN__.getSnapshot().entered, null, {
        timeout: 30000,
      });
    };
    async function waitSnap(pred, timeoutMs, label) {
      const t0 = Date.now();
      let last = null;
      while (Date.now() - t0 < timeoutMs) {
        last = await snap();
        if (pred(last)) return last;
        await page.waitForTimeout(100);
      }
      throw new Error(`timeout esperando ${label}; último snapshot mode=${last?.mode}`);
    }

    await page.addInitScript(() => {
      window.__UAIDZIN_SKIP_BOOT__ = {
        id: "smoke:slot:0",
        name: "Smoke",
        classId: "TK",
        level: 1,
        evolution: "Mortal",
        gold: 500,
        attrs: { FOR: 12, DES: 12, CONS: 12, INT: 12 },
      };
    });

    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitApi();
    await page.evaluate(async () => {
      await window.__UAIDZIN__.clearSave();
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitApi();
    await page.waitForTimeout(500);

    // 1. BOOT
    let s = await snap();
    if (s.mode === "CITY") ok("boot mode=CITY");
    else fail(`boot mode esperado "CITY", recebido "${s.mode}"`);
    if (s.classId === "TK") ok("boot classId=TK");
    else fail(`boot classId esperado "TK", recebido "${s.classId}"`);
    if (s.level === 1) ok("boot level=1");
    else fail(`boot level esperado 1, recebido ${s.level}`);
    const skipLock = await page.evaluate(async () =>
      (await navigator.locks.query()).held.map((l) => l.name).filter((n) => n.startsWith("uaidzin:account:")),
    );
    if (skipLock.length === 1) ok(`lock de conta adquirido pelo skip (${skipLock[0]})`);
    else fail(`lock de conta pelo skip: ${JSON.stringify(skipLock)}`);

    const logged = await page.evaluate(async () => window.__UAIDZIN__.login("admin", "admin"));
    if (logged && logged.ok === true) ok("sessão de conta admin");
    else fail(`login admin/admin falhou: ${logged && logged.error ? logged.error : "sem retorno"}`);

    const shortcuts = [
      { key: "KeyC", id: "p-person", label: "C personagem" },
      { key: "KeyK", id: "p-skills", label: "K skills" },
      { key: "KeyI", id: "p-inv", label: "I inventário" },
      { key: "KeyB", id: "p-vault", label: "B baú" },
    ];
    for (const sc of shortcuts) {
      await page.evaluate(() => {
        document.querySelectorAll("#wire-ui .win").forEach((win) => win.classList.add("is-closed"));
      });
      await page.keyboard.press(sc.key);
      await page.waitForTimeout(200);
      const open = await page.evaluate((id) => {
        const el = document.querySelector("#wire-ui #" + id);
        return !!el && !el.classList.contains("is-closed");
      }, sc.id);
      if (open) ok(`atalho ${sc.label} abriu o painel`);
      else fail(`atalho ${sc.label} não abriu #${sc.id}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    }

    await page.evaluate(() => {
      window.__UAIDZIN__.session.progression.state.evolution = "Arch";
    });
    await page.evaluate(() => window.__UAIDZIN__.confirmInteraction("portal-city-decor"));
    await page.waitForTimeout(300);
    s = await snap();
    if (s.mode !== "DUNGEON") ok("portal recusa evolução Arch");
    else fail('portal com evolution=Arch entrou em DUNGEON');
    await page.evaluate(() => {
      window.__UAIDZIN__.session.progression.state.evolution = "Mortal";
    });

    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    try {
      s = await waitSnap((x) => x.mode === "DUNGEON", 8000, 'mode "DUNGEON"');
      ok("entrou na dungeon");
    } catch (err) {
      fail(`dungeon: esperado mode "DUNGEON" em até 8s, ${err.message}`);
      s = await snap();
    }
    if (s.enemiesAlive > 0) ok(`inimigos vivos=${s.enemiesAlive}`);
    else fail(`dungeon enemiesAlive esperado > 0, recebido ${s.enemiesAlive}`);

    await page.evaluate(() => {
      window.__UAIDZIN__.learnFirstSkill();
      window.__UAIDZIN__.learnRandomSkill();
    });
    const skillCdGuard = await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      if (sess.skillLoadout.slots[0]) sess.skillLoadout.slots[0].cd = 99;
      const dummy = [{ id: "t", x: sess.player.x, z: sess.player.z, alive: true }];
      const cast = sess.skill.tick(
        0,
        false,
        0,
        dummy,
        sess.player.x,
        sess.player.z,
        sess.player.facing,
        () => 0,
        () => 0,
        () => ({ hp: 10, maxHp: 10 }),
        sess.buffs,
        sess.form,
        sess.summons,
        null,
      );
      return cast === null;
    });
    if (skillCdGuard) ok("slot em cooldown não dispara outra skill");
    else fail("slot em cooldown disparou outra skill");

    const wallIdle = await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      const p = sess.player;
      const world = sess.worlds.getCurrent();
      if (!world) return false;
      const x0 = p.x;
      const z0 = p.z;
      p.update(0.05, 1, 0, world.boundary, world.collision);
      const moved = Math.hypot(p.x - x0, p.z - z0) > 1e-6;
      return p.isMoving === moved;
    });
    if (wallIdle) ok("isMoving segue deslocamento efetivo");
    else fail("isMoving divergiu do deslocamento efetivo");

    await page.evaluate(() => {
      window.__UAIDZIN__.session.debugSetDodgeChance(1);
      window.__UAIDZIN__.session.lastCombatMissAt = 0;
    });
    const missTarget = await page.evaluate(() => {
      const list = window.__UAIDZIN__.getAliveEnemies() || [];
      if (!list.length) return null;
      const e = list[0];
      return { x: e.x, z: e.z + 0.6 };
    });
    if (missTarget) {
      await page.evaluate(({ x, z }) => window.__UAIDZIN__.teleportPlayer(x, z), missTarget);
    }
    await page.waitForTimeout(1200);
    const missAt = await page.evaluate(() => window.__UAIDZIN__.session.lastCombatMissAt);
    const missText = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll(".dmg-number")];
      return nodes.some((n) => n.textContent === "MISS");
    });
    if (missAt > 0 && missText) ok("MISS visível e combat:miss emitido");
    else fail(`MISS esperado (lastCombatMissAt=${missAt}, texto=${missText})`);
    await page.evaluate(() => window.__UAIDZIN__.session.debugSetDodgeChance(0.05));

    // 3. COMBATE
    await page.evaluate(() => window.__UAIDZIN__.setTimeScale(10));
    let maxFx = 0;
    let maxKills = 0;
    const combatStart = Date.now();
    while (Date.now() - combatStart < 60000) {
      const cur = await snap();
      maxFx = Math.max(maxFx, cur.fxCount);
      maxKills = Math.max(maxKills, cur.kills);
      if (maxKills > 0) break;
      if (cur.mode !== "DUNGEON") break;
      const target = await page.evaluate(() => {
        const list = window.__UAIDZIN__.getAliveEnemies() || [];
        if (!list.length) return null;
        const e = list[0];
        return { x: e.x, z: e.z + 0.6 };
      });
      if (target) {
        await page.evaluate(({ x, z }) => window.__UAIDZIN__.teleportPlayer(x, z), target);
      }
      await page.waitForTimeout(700);
      const after = await snap();
      maxFx = Math.max(maxFx, after.fxCount);
      maxKills = Math.max(maxKills, after.kills);
    }
    if (maxKills > 0) ok(`kills=${maxKills}`);
    else fail(`combate kills esperado > 0, recebido ${maxKills} após 60s`);
    if (maxFx > 0) ok(`fxCount máximo observado=${maxFx}`);
    else fail(`combate fxCount máximo esperado > 0, recebido ${maxFx}`);

    // 4. CIDADE LIMPA
    await page.evaluate(() => window.__UAIDZIN__.setTimeScale(1));
    await page.evaluate(() => window.__UAIDZIN__.toCity());
    try {
      s = await waitSnap((x) => x.mode === "CITY", 15000, 'mode "CITY" após sair da dungeon');
      ok("volta para cidade mode=CITY");
    } catch (err) {
      fail(`cidade: ${err.message}`);
      s = await snap();
    }
    if (s.enemiesAlive === 0) ok("cidade sem inimigos");
    else fail(`cidade enemiesAlive esperado 0, recebido ${s.enemiesAlive}`);
    if (s.timerPhase === "idle") ok('cidade timerPhase="idle"');
    else fail(`cidade timerPhase esperado "idle", recebido "${s.timerPhase}"`);

    // fxCount é contador acumulado de VFX (EffectManager.count só incrementa),
    // não contagem de efeitos vivos. Parado na cidade ele não pode crescer.
    const fxIdleStart = s.fxCount;
    await page.waitForTimeout(1500);
    const fxIdleEnd = (await snap()).fxCount;
    if (fxIdleEnd === fxIdleStart) ok(`cidade sem VFX novo parado (fxCount estável em ${fxIdleEnd})`);
    else fail(`cidade gerou VFX parada: fxCount ${fxIdleStart} → ${fxIdleEnd}`);

    // 4b. EQUIPAMENTO — bônus tem de sobreviver a recomputeCombatStats().
    // Regressão: base e equipamento já escreveram o mesmo campo, então subir de
    // nível apagava o bônus e desequipar deixava o atributo abaixo do base.
    const equipResult = await page.evaluate(() => {
      const s = window.__UAIDZIN__.session;
      const base = { attack: s.character.attack, defense: s.character.defense };
      const item = {
        uid: "smoke_weapon_1",
        defId: "smoke_sword",
        name: "Espada de Teste",
        rarity: "comum",
        slot: "weapon",
        refine: 0,
        attackBonus: 10,
        defenseBonus: 3,
        stack: 1,
        sellValue: 1,
      };
      if (!s.inventory.add(item)) return { error: "inventário cheio" };
      if (!s.equipment.equip(item.uid)) return { error: "equip falhou" };
      const equipped = { attack: s.character.attack, defense: s.character.defense };
      s.progression.recomputeCombatStats();
      const afterRecompute = { attack: s.character.attack, defense: s.character.defense };
      s.equipment.unequip("weapon");
      const afterUnequip = { attack: s.character.attack, defense: s.character.defense };
      return { base, equipped, afterRecompute, afterUnequip };
    });

    if (equipResult.error) {
      fail(`equipamento: ${equipResult.error}`);
    } else {
      const { base, equipped, afterRecompute, afterUnequip } = equipResult;
      if (equipped.attack === base.attack + 10) ok(`equipar somou ataque (${base.attack} → ${equipped.attack})`);
      else fail(`equipar: ataque esperado ${base.attack + 10}, recebido ${equipped.attack}`);

      if (afterRecompute.attack === base.attack + 10) ok("bônus sobrevive a recomputeCombatStats");
      else fail(`recompute apagou o bônus: ataque esperado ${base.attack + 10}, recebido ${afterRecompute.attack}`);

      if (afterRecompute.defense === base.defense + 3) ok("bônus de defesa sobrevive a recomputeCombatStats");
      else fail(`recompute apagou a defesa: esperado ${base.defense + 3}, recebido ${afterRecompute.defense}`);

      if (afterUnequip.attack === base.attack) ok(`desequipar volta ao base (${afterUnequip.attack})`);
      else fail(`desequipar: ataque esperado ${base.attack}, recebido ${afterUnequip.attack}`);

      if (afterUnequip.defense === base.defense) ok(`desequipar volta defesa ao base (${afterUnequip.defense})`);
      else fail(`desequipar: defesa esperada ${base.defense}, recebida ${afterUnequip.defense}`);
    }

    // 5. SAVE — round-trip exato a partir do estado estável da cidade.
    // Feito na cidade (sem combate correndo) para que o valor não mude sob o teste.
    const before = await snap();
    if (before.gold > 0) ok(`estado pré-save não trivial (gold=${before.gold})`);
    else fail(`pré-save esperava gold > 0 para o round-trip valer algo, recebido ${before.gold}`);

    await page.evaluate(async () => {
      await window.__UAIDZIN__.persistSave();
    });
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitApi();
    await page.waitForTimeout(800);
    s = await snap();
    if (s.level === before.level) ok(`save round-trip level=${s.level}`);
    else fail(`save level esperado exatamente ${before.level}, recebido ${s.level}`);
    if (s.gold === before.gold) ok(`save round-trip gold=${s.gold}`);
    else fail(`save gold esperado exatamente ${before.gold}, recebido ${s.gold}`);
    if (s.invUsed === before.invUsed) ok(`save round-trip invUsed=${s.invUsed}`);
    else fail(`save invUsed esperado ${before.invUsed}, recebido ${s.invUsed}`);

    const goldBeforeVault = s.gold;
    await page.evaluate(() => {
      window.__UAIDZIN__.session.progressState.dungeonsUnlocked = ["dungeon-1"];
      window.__UAIDZIN__.session.depositGoldToVault(10);
    });
    const midVault = await page.evaluate(() => ({
      vault: window.__UAIDZIN__.session.accountVault.gold,
      gold: window.__UAIDZIN__.session.inventory.gold,
    }));
    if (midVault.vault >= 10 && midVault.gold === goldBeforeVault - 10) {
      ok("ouro saiu do inventário e entrou no cofre");
    } else {
      fail(`cofre em memória: vault=${midVault.vault} gold=${midVault.gold}`);
    }
    await page.evaluate(async () => {
      await window.__UAIDZIN__.persistAccountVault();
      await window.__UAIDZIN__.persistSave();
    });
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitApi();
    await page.waitForTimeout(800);
    const progressKept = await page.evaluate(
      () => window.__UAIDZIN__.session.progressState.dungeonsUnlocked.includes("dungeon-1"),
    );
    const vaultGold = await page.evaluate(() => window.__UAIDZIN__.session.accountVault.gold);
    const sessionUser = await page.evaluate(() => window.__UAIDZIN__.sessionUser());
    if (progressKept) ok("progress sobrevive ao save");
    else fail("progress.dungeonsUnlocked foi apagado no save");
    if (sessionUser !== "admin") fail(`sessão após reload: esperado admin, recebido ${sessionUser}`);
    else if (vaultGold >= 10) ok("cofre persistiu após reload");
    else fail(`cofre após reload: vault=${vaultGold}, esperado >= 10`);

    const uidsBefore = await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      const eq = sess.equipment.snapshotEquipped();
      return [
        ...sess.inventory.items.map((i) => i.uid),
        ...Object.values(eq).map((i) => i && i.uid).filter(Boolean),
        ...sess.accountVault.items.map((i) => i.uid),
      ];
    });
    await page.evaluate(() => {
      window.__UAIDZIN__.session.economy.grantKillLoot("fixed", true);
    });
    const uidsAfter = await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      const eq = sess.equipment.snapshotEquipped();
      return [
        ...sess.inventory.items.map((i) => i.uid),
        ...Object.values(eq).map((i) => i && i.uid).filter(Boolean),
        ...sess.accountVault.items.map((i) => i.uid),
      ];
    });
    const unique = new Set(uidsAfter).size === uidsAfter.length;
    const grew = uidsAfter.length >= uidsBefore.length;
    if (unique && grew) ok("uid de item sem colisão após reload");
    else fail(`uid duplicado ou drop falhou before=${uidsBefore.length} after=${uidsAfter.length} unique=${new Set(uidsAfter).size}`);

    await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      const cur = sess.progression.state.level;
      if (cur < 160) window.__UAIDZIN__.debugAddLevels(160 - cur);
      sess.progression.state.evolution = "Mortal";
      const w = window.__UAIDZIN__.wire;
      if (w && sess.inventory.countMaterial("entry_d4") < 1) w.buyShop("merchant", "entry_d4");
    });
    const d4Gate = await page.evaluate(() => window.__UAIDZIN__.enterDungeonById("dungeon-4"));
    if (!d4Gate?.ok) fail(`dungeon-4 recusada: ${JSON.stringify(d4Gate)}`);
    try {
      s = await waitSnap((x) => x.mode === "DUNGEON", 8000, 'mode "DUNGEON" na D4');
      ok("nível 160 entrou na D4");
    } catch (err) {
      fail(`D4: esperado mode "DUNGEON", ${err.message}`);
    }

    await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      sess.deathEmitCount = 0;
      sess.character.hp = 1;
      sess.character.isDead = false;
      window.__UAIDZIN__.setTimeScale(10);
      for (const e of sess.enemies.enemies) {
        if (!e.alive) continue;
        e.x = sess.player.x;
        e.z = sess.player.z;
        e.attackCooldown = 0;
      }
    });
    await page.waitForTimeout(1500);
    const deaths = await page.evaluate(() => window.__UAIDZIN__.session.deathEmitCount);
    if (deaths === 1) ok("character:death emitido uma vez");
    else fail(`character:death esperado 1, recebido ${deaths}`);

    await page.evaluate(async () => {
      await window.__UAIDZIN__.persistSave();
    });
    await page.waitForTimeout(400);
    const profileId = await page.evaluate(() => window.__UAIDZIN__.session.saveService.getProfileId());
    const corruptMark = "SMOKE_CORRUPT_BLOB";
    const sections = ["meta", "character", "skills", "skillLoadout", "equipment", "inventory", "bags", "buffs", "progress", "options"];
    await page.evaluate(async ({ id, mark, sections }) => {
      localStorage.setItem(`uaidzin.mirror.${id}`, mark);
      await new Promise((resolve) => {
        const req = indexedDB.open("uaidzin", 3);
        req.onerror = () => resolve();
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction("sections", "readwrite");
            const store = tx.objectStore("sections");
            for (const section of sections) store.put(mark, `profile:${id}:${section}`);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => resolve();
          } catch {
            resolve();
          }
        };
      });
    }, { id: profileId, mark: corruptMark, sections });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.getElementById("overlay-save-error")?.classList.contains("open"),
      null,
      { timeout: 20000 },
    );
    ok("tela de save ilegível aberta");
    await page.click("#btn-save-error-retry");
    await page.waitForFunction(
      () => document.getElementById("overlay-save-error")?.classList.contains("open"),
      null,
      { timeout: 20000 },
    );
    ok("tentar de novo relê e mantém a tela de erro");
    await page.waitForTimeout(1000);
    const blobAfter = await page.evaluate(
      (id) =>
        new Promise((resolve) => {
          const req = indexedDB.open("uaidzin", 3);
          req.onerror = () => resolve(null);
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction("sections", "readonly");
            const get = tx.objectStore("sections").get(`profile:${id}:character`);
            get.onsuccess = () => resolve(get.result ?? null);
            get.onerror = () => resolve(null);
            tx.oncomplete = () => db.close();
          };
        }),
      profileId,
    );
    const entered = await page.evaluate(() => !!window.__UAIDZIN__?.getSnapshot?.()?.entered);
    if (!entered) ok("save ilegível não entrou no jogo");
    else fail("save ilegível entrou no jogo");
    if (blobAfter === corruptMark) ok("blob corrompido não foi sobrescrito");
    else fail(`blob foi substituído após save ilegível (prefixo=${String(blobAfter).slice(0, 40)})`);
  } finally {
    await browser.close();
    killServer();
    clearTimeout(globalTimer);
  }

  if (pageErrors > 0) fail(`${pageErrors} pageerror(s) no console da página`);

  if (failed) {
    console.error("SMOKE_FAILED", failed);
    process.exit(1);
  }
  console.log("SMOKE_PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err.stack || err.message);
  killServer();
  process.exit(1);
});
