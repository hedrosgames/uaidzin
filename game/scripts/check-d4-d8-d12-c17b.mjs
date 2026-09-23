import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed += 1;
  console.error("FAIL", m);
};

async function wipe(page) {
  await page.goto(BASE + "/tools/save-wipe.html?auto=all", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
}

async function loginAdmin(page, frame) {
  await frame.locator("#user").waitFor({ timeout: 20000 });
  await frame.locator("#user").fill("admin");
  await frame.locator("#pass").fill("admin");
  await frame.locator("#btnLogin").click();
  await page.waitForFunction(
    () => {
      const f = document.querySelector("iframe");
      return !!f && /02-selecao/.test(f.contentWindow?.location?.href || "");
    },
    null,
    { timeout: 20000 },
  );
}

async function waitMode(page, mode, timeoutMs = 25000) {
  await page.waitForFunction(
    (m) => window.__UAIDZIN__?.getSnapshot?.()?.mode === m,
    mode,
    { timeout: timeoutMs },
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await wipe(page);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(600);
const frame = page.frameLocator("iframe").first();
await loginAdmin(page, frame);

await frame.locator("#btnCreateFirst").click();
await frame.locator("#newName").fill("DungeCheck");
await frame.locator("#btnCreateConfirm").click();
await page.waitForTimeout(900);
await frame.locator("#btnConnect").click();
await page.waitForFunction(
  () => window.__UAIDZIN__?.session?.character?.name === "DungeCheck",
  null,
  { timeout: 30000 },
);
await waitMode(page, "CITY");
await page.waitForTimeout(400);

const enter1 = await page.evaluate(() => window.__UAIDZIN__.session.tryEnterDungeon("dungeon-1"));
if (!enter1?.ok) fail(`D4 enter: ${JSON.stringify(enter1)}`);
await waitMode(page, "DUNGEON");

const d4 = await page.evaluate(() => {
  const s = window.__UAIDZIN__.session;
  const enemies = s.enemies.enemies.map((e) => ({
    id: e.id,
    maxHp: e.maxHp,
    attack: e.attack,
    defense: e.defense,
    isBoss: e.isBoss,
  }));
  const fixed = enemies.find((e) => String(e.id).includes("a1-f1") && !e.isBoss);
  return {
    dungeonId: s.activeDungeonId,
    enemies,
    fixed,
    count: enemies.length,
  };
});

if (!d4.fixed) fail(`D4: sem fixed a1-f1 (${JSON.stringify(d4)})`);
else if (d4.dungeonId !== "dungeon-1") fail(`D4: activeDungeonId=${d4.dungeonId}`);
else if (d4.fixed.maxHp > 25) fail(`D4: HP fixed alto demais (${d4.fixed.maxHp})`);
else if (d4.fixed.attack > 5) fail(`D4: atk fixed alto demais (${d4.fixed.attack})`);
else if (d4.count !== 6) fail(`D4: esperado 6 spawns, veio ${d4.count}`);
else ok(`D4: fixed HP ${d4.fixed.maxHp} atk ${d4.fixed.attack} spawns ${d4.count}`);

const d8 = await page.evaluate(() => {
  const mojibake = /Ã§|Ãµ|Ã­|Ã£|â€|Â·/;
  return { sampleOk: !mojibake.test("Opções ilegível — Salvando… · painéis") };
});
if (!d8.sampleOk) fail("D8: amostra pt-BR ainda com encoding ruim");
else ok("D8: amostras pt-BR ok (sem mojibake)");

await page.evaluate(() => window.__UAIDZIN__.session.returnToCityWithFade());
await waitMode(page, "CITY");
await page.waitForTimeout(400);

const c17 = await page.evaluate(async () => {
  const api = window.__UAIDZIN__;
  const s = api.session;
  s.character.level = 160;
  s.progression.state.level = 160;
  s.progression.state.evolution = "Mortal";
  const beforeEmpty = s.tryEnterDungeon("dungeon-4");
  s.inventory.add({
    uid: "entry-test-1",
    defId: "entry_d4",
    name: "Selo D4",
    rarity: "Comum",
    slot: "material",
    refine: 0,
    attackBonus: 0,
    defenseBonus: 0,
    stack: 1,
    sellValue: 0,
  });
  const countBefore = s.inventory.countMaterial("entry_d4");
  const withItem = s.tryEnterDungeon("dungeon-4");
  const countAfter = s.inventory.countMaterial("entry_d4");
  await api.persistSave(true);
  return { beforeEmpty, countBefore, withItem, countAfter };
});

if (!c17.beforeEmpty || c17.beforeEmpty.ok !== false || c17.beforeEmpty.reason !== "entry") {
  fail(`C17b: sem item deveria bloquear entry, veio ${JSON.stringify(c17.beforeEmpty)}`);
} else if (c17.countBefore < 1) {
  fail("C17b: falhou ao adicionar entry_d4");
} else if (!c17.withItem?.ok) {
  fail(`C17b: com item deveria entrar, veio ${JSON.stringify(c17.withItem)}`);
} else if (c17.countAfter !== 0) {
  fail(`C17b: deveria debitar, countAfter=${c17.countAfter}`);
} else ok("C17b: bloqueia sem item e debita com item");

await waitMode(page, "DUNGEON");
await page.waitForTimeout(400);

const mid = await page.evaluate(async () => {
  const api = window.__UAIDZIN__;
  const s = api.session;
  const enemy = s.enemies.enemies.find((e) => e.alive && !e.isBoss);
  if (!enemy) return { error: "no-enemy" };
  api.teleportPlayer(enemy.x, enemy.z);
  enemy.hp = 1;
  enemy.defense = 0;
  const goldBefore = s.inventory.gold;
  const xpBefore = s.progression.state.xp;
  let killed = false;
  const writesBefore = api.save.writeCount();
  for (let i = 0; i < 240; i++) {
    s.update(1 / 60, 16 / 9, false);
    if (!enemy.alive) {
      killed = true;
      break;
    }
  }
  const goldMid = s.inventory.gold;
  const xpMid = s.progression.state.xp;
  const started = Date.now();
  while (api.save.writeCount() <= writesBefore && Date.now() - started < 4000) {
    await new Promise((r) => setTimeout(r, 50));
  }
  await api.save.flush();
  const exported = await api.save.exportProfile();
  const payload = typeof exported === "string" ? JSON.parse(exported) : exported;
  return {
    killed,
    goldBefore,
    goldMid,
    xpBefore,
    xpMid,
    writesBefore,
    writesAfter: api.save.writeCount(),
    blobGold: payload?.inventory?.gold,
    blobXp: payload?.character?.xp,
  };
});

if (mid.error) fail(`D12 mid: ${JSON.stringify(mid)}`);
else if (!mid.killed) fail("D12: não matou inimigo via combate");
else if (mid.goldMid <= mid.goldBefore && mid.xpMid <= mid.xpBefore) {
  fail(`D12: kill não deu ouro/XP (${JSON.stringify(mid)})`);
} else if (mid.blobGold !== mid.goldMid) {
  fail(`D12: ouro no export ${mid.blobGold} ≠ memória ${mid.goldMid}`);
} else if (mid.blobXp !== mid.xpMid) {
  fail(`D12: XP no export ${mid.blobXp} ≠ memória ${mid.xpMid}`);
} else {
  ok(`D12: kill flush ouro ${mid.goldMid} xp ${mid.xpMid}`);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(
    () => window.__UAIDZIN__?.session?.character?.name === "DungeCheck",
    null,
    { timeout: 30000 },
  );
  await waitMode(page, "CITY");
  const after = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    return { gold: s.inventory.gold, xp: s.progression.state.xp, mode: window.__UAIDZIN__.getSnapshot().mode };
  });
  if (after.gold !== mid.goldMid) fail(`D12 reload: ouro ${after.gold} ≠ ${mid.goldMid}`);
  else if (after.xp !== mid.xpMid) fail(`D12 reload: xp ${after.xp} ≠ ${mid.xpMid}`);
  else if (after.mode !== "CITY") fail(`D12 reload: mode ${after.mode}`);
  else ok(`D12: reload cidade mantém ouro ${after.gold} xp ${after.xp}`);
}

await browser.close();
if (failed) {
  console.error(`FAILED ${failed}`);
  process.exit(1);
}
console.log("ALL OK");
