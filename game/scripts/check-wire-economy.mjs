import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let server = null;
let serverPort = null;

function killServer() {
  if (!server || server.killed) return;
  if (process.platform === "win32" && server.pid) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGTERM");
  }
  server = null;
}

process.on("exit", killServer);

async function probeUrl(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function resolveBaseUrl() {
  if (process.env.UAIDZIN_BASE) return process.env.UAIDZIN_BASE;
  const candidates = [5181, 4173, 5173];
  for (const port of candidates) {
    if (await probeUrl(`http://127.0.0.1:${port}/`)) {
      return `http://127.0.0.1:${port}`;
    }
  }

  serverPort = 4173;
  server = spawn(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "vite", "bin", "vite.js"),
      "preview",
      "--port",
      String(serverPort),
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    {
      cwd: ROOT,
      stdio: "ignore",
    },
  );

  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (await probeUrl(`http://127.0.0.1:${serverPort}/`)) {
      return `http://127.0.0.1:${serverPort}`;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Falha ao subir vite preview");
}

let failed = 0;
function ok(msg) {
  console.log("OK", msg);
}
function fail(msg) {
  failed += 1;
  console.error("FAIL", msg);
}

async function run() {
  const base = await resolveBaseUrl();
  console.log(`[check-wire-economy] testando em ${base}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on("pageerror", (err) => {
    fail(`pageerror: ${err.message}`);
  });

  try {
    await page.goto(`${base}/tools/save-wipe.html?auto=all`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(400);

    await page.addInitScript(() => {
      window.__UAIDZIN_SKIP_BOOT__ = {
        id: "admin:slot:0",
        name: "EconHero",
        classId: "TK",
        level: 10,
        evolution: "Mortal",
        gold: 10000,
        attrs: { FOR: 15, DES: 15, CONS: 15, INT: 10 },
      };
    });

    await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => !!window.__UAIDZIN__?.session?.character?.name, null, {
      timeout: 30000,
    });
    await page.waitForFunction(() => window.__UAIDZIN__?.getSnapshot?.()?.mode === "CITY", null, {
      timeout: 30000,
    });
    await page.evaluate(async () => window.__UAIDZIN__.login("admin", "admin"));
    ok("Cidade carregada com sessão ativa");

    const skillResult = await page.evaluate(async () => {
      const sess = window.__UAIDZIN__.session;
      const api = window.__UAIDZIN__.wire;
      sess.inventory.gold = 5000;
      sess.skillTree.state.skillPoints = 5;

      const goldBefore = sess.inventory.gold;
      const cost = api.skillGoldCost(0);
      const learnedFirst = api.learnSkill("fisica", 0);
      const goldAfter = sess.inventory.gold;
      const learnedAgain = api.learnSkill("fisica", 0);
      const goldAfterAgain = sess.inventory.gold;

      const cat = api.pullSkillCatalog();
      const sk = cat.skills["fisica-1"];

      await sess.saves.checkpoint();

      return {
        learnedFirst,
        learnedAgain,
        goldBefore,
        goldAfter,
        goldAfterAgain,
        cost,
        isLearned: sk?.learned,
      };
    });

    if (skillResult.learnedFirst && skillResult.isLearned) {
      ok("comprar skill aprende técnica");
    } else {
      fail(`falha ao aprender skill: ${JSON.stringify(skillResult)}`);
    }

    if (skillResult.goldAfter === skillResult.goldBefore - skillResult.cost) {
      ok("comprar skill debita ouro corretamente");
    } else {
      fail(`debito de ouro incorreto: ${skillResult.goldBefore} -> ${skillResult.goldAfter}, custo=${skillResult.cost}`);
    }

    if (!skillResult.learnedAgain && skillResult.goldAfterAgain === skillResult.goldAfter) {
      ok("recompra bloqueada sem debitar ouro novamente");
    } else {
      fail(`recompra permitida ou ouro debitado: ${JSON.stringify(skillResult)}`);
    }

    const sellConfirmResult = await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      const api = window.__UAIDZIN__.wire;
      const item = {
        uid: "test_sell_gem",
        defId: "gem_ruby",
        name: "Rubi Bruto",
        slot: "misc",
        rarity: "Raro",
        refine: 0,
        attackBonus: 0,
        defenseBonus: 0,
        stack: 2,
        sellValue: 150,
      };
      sess.inventory.add(item);
      const goldBefore = sess.inventory.gold;
      const res = api.sellItem(item.uid, 2);
      const goldAfter = sess.inventory.gold;
      const itemAfter = sess.inventory.items.find((i) => i.uid === item.uid);
      return {
        res,
        goldBefore,
        goldAfter,
        itemExists: !!itemAfter,
      };
    });

    if (sellConfirmResult.res.ok && sellConfirmResult.goldAfter === sellConfirmResult.goldBefore + 300 && !sellConfirmResult.itemExists) {
      ok("venda remove item e credita ouro");
    } else {
      fail(`falha na venda de item: ${JSON.stringify(sellConfirmResult)}`);
    }

    const discardResult = await page.evaluate(async () => {
      const sess = window.__UAIDZIN__.session;
      const api = window.__UAIDZIN__.wire;
      const item = {
        uid: "test_discard_junk",
        defId: "old_junk",
        name: "Lixo Antigo",
        slot: "misc",
        rarity: "Comum",
        refine: 0,
        attackBonus: 0,
        defenseBonus: 0,
        stack: 1,
        sellValue: 1,
      };
      sess.inventory.add(item);
      const discarded = api.discardItem(item.uid);
      await sess.saves.checkpoint();
      return { discarded, uid: item.uid };
    });

    if (discardResult.discarded) {
      ok("descarte executado com sucesso");
    } else {
      fail("falha no descarte do item");
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__UAIDZIN__?.session?.character?.name, null, {
      timeout: 30000,
    });
    await page.waitForTimeout(500);

    const discardPersisted = await page.evaluate((targetUid) => {
      const sess = window.__UAIDZIN__.session;
      return !sess.inventory.items.some((i) => i.uid === targetUid);
    }, discardResult.uid);

    if (discardPersisted) {
      ok("descarte permanece após reload");
    } else {
      fail("item descartado reapareceu após reload");
    }

    const refineResult = await page.evaluate(() => {
      const sess = window.__UAIDZIN__.session;
      const api = window.__UAIDZIN__.wire;
      sess.inventory.gold = 50000;
      sess.inventory.add({
        uid: "mat_ori_refine",
        defId: "mat_ori",
        name: "Oriharukon",
        slot: "material",
        rarity: "Comum",
        refine: 0,
        attackBonus: 0,
        defenseBonus: 0,
        stack: 5,
        sellValue: 10,
      });

      const weapon = {
        uid: "test_sword_refine",
        defId: "iron_sword",
        name: "Espada de Ferro",
        slot: "weapon",
        rarity: "Comum",
        refine: 0,
        attackBonus: 20,
        defenseBonus: 0,
        stack: 1,
        sellValue: 100,
      };
      sess.inventory.add(weapon);
      const res = sess.refinement.refine(weapon, () => 0);
      sess.equipment.onItemRefined(weapon);
      sess.saves.markDirty(["inventory", "equipment"], "critical");

      return {
        res,
        refine: weapon.refine,
      };
    });

    if (refineResult.res.ok && refineResult.refine === 1) {
      ok("refino +1 incrementa exatamente uma vez");
    } else {
      fail(`refino falhou: ${JSON.stringify(refineResult)}`);
    }

    const barAndSortResult = await page.evaluate(async () => {
      const sess = window.__UAIDZIN__.session;
      const api = window.__UAIDZIN__.wire;

      api.equipSkill(0, "caca-1");
      api.equipSkill(1, "fisica-1");

      const items = sess.inventory.items.map((i) => i.uid);
      if (items.length >= 2) {
        items.reverse();
        api.reorderBag(items);
      }

      await sess.saves.checkpoint();
      await window.__UAIDZIN__.persistSave();

      const barBefore = api.getSkillBar().map((s) => ({ idx: s.slotIndex, id: s.skillId }));
      const bagBefore = api.snapshotInventory().items.map((i) => i.uid);

      return { barBefore, bagBefore };
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__UAIDZIN__?.session?.character?.name, null, {
      timeout: 30000,
    });
    await page.waitForTimeout(500);

    const reloadVerified = await page.evaluate((expected) => {
      const api = window.__UAIDZIN__.wire;
      const barAfter = api.getSkillBar().map((s) => ({ idx: s.slotIndex, id: s.skillId }));
      const bagAfter = api.snapshotInventory().items.map((i) => i.uid);

      const barMatches =
        barAfter[0]?.id === expected.barBefore[0]?.id &&
        barAfter[1]?.id === expected.barBefore[1]?.id;

      const bagMatches =
        expected.bagBefore.length === 0 ||
        expected.bagBefore.every((uid, i) => bagAfter[i] === uid);

      return { barMatches, bagMatches, barAfter, bagAfter };
    }, barAndSortResult);

    if (reloadVerified.barMatches) {
      ok("barra de skills persistiu após reload");
    } else {
      fail(`barra divergiu após reload: ${JSON.stringify(reloadVerified)}`);
    }

    if (reloadVerified.bagMatches) {
      ok("ordem da bolsa persistiu após reload");
    } else {
      fail(`ordem da bolsa divergiu após reload: ${JSON.stringify(reloadVerified)}`);
    }
  } finally {
    await browser.close();
    killServer();
  }

  if (failed > 0) {
    console.error(`[check-wire-economy] FALHOU com ${failed} erro(s)`);
    process.exit(1);
  }

  console.log("[check-wire-economy] PASSOU com sucesso em todos os critérios");
  process.exit(0);
}

run().catch((err) => {
  console.error("FATAL", err.stack || err.message);
  killServer();
  process.exit(1);
});
