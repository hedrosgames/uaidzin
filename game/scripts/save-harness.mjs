import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;

function ok(msg) {
  console.log("SAVE_OK", msg);
}
function fail(msg) {
  failed += 1;
  console.error("SAVE_FAIL", msg);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });

  await page.evaluate(async () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("uaidzin") && k !== "uaidzin_settings") keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase("uaidzin");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const frame = page.frameLocator("iframe").first();
  await frame.locator("#user, input[name='user'], #loginUser").first().waitFor({ timeout: 30000 }).catch(() => {});

  const userInput = frame.locator("input").nth(0);
  const passInput = frame.locator("input[type='password']").first();
  await userInput.fill("admin");
  await passInput.fill("admin");
  const remember = frame.locator("input[type='checkbox']").first();
  if (await remember.count()) await remember.check();
  await frame.locator("button[type='submit'], #btnLogin").first().click();

  await page.waitForTimeout(1500);

  const loginBlob = await page.evaluate(() => localStorage.getItem("uaidzin_login"));
  if (loginBlob && loginBlob.includes('"pass"')) fail("lembrar login ainda guarda senha");
  else ok("lembrar login sem senha");

  const hasSubtle = await page.evaluate(() => {
    const f = document.querySelector("iframe");
    try {
      return f?.contentWindow?.UaidzinSave?._debug?.hasSubtle;
    } catch {
      return null;
    }
  });
  if (hasSubtle === false) fail("hasSubtle ainda false no boot");
  else ok("crypto.subtle disponível no boot (" + String(hasSubtle) + ")");

  await frame.locator(".slot, .char, #slotList button, #slotList .slot-card").first().waitFor({ timeout: 20000 }).catch(() => {});

  const slotCards = frame.locator("#slotList .slot, #slotList button, .slot-card, #slotList > *");
  const n = await slotCards.count();
  if (n > 0) {
    await slotCards.nth(0).click();
    await page.waitForTimeout(400);
    ok("selecionou slot 0");
  } else {
    fail("nenhum slot na seleção");
  }

  const connect = frame.locator("#btnConnect, button:has-text('Entrar'), button:has-text('Conectar')").first();
  if (await connect.count()) {
    await connect.click();
  } else {
    fail("botão entrar ausente");
  }

  await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.()?.entered, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  ok("jogo carregou __UAIDZIN__");

  const before = await page.evaluate(() => window.__UAIDZIN__.save?.writeCount?.() ?? 0);
  await page.evaluate(async () => {
    window.__UAIDZIN__.session.inventory.gold += 17;
    await window.__UAIDZIN__.save.persist();
  });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__UAIDZIN__.save?.writeCount?.() ?? 0);
  const status = await page.evaluate(() => window.__UAIDZIN__.save?.status?.());
  if (after > before) ok("persist incrementou writeCount (" + before + "→" + after + ")");
  else fail("persist não gravou");
  if (status === "saved" || status === "idle" || status === "saving") ok("status save=" + status);
  else fail("status inesperado " + status);

  const gold1 = await page.evaluate(() => window.__UAIDZIN__.session.inventory.gold);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.()?.entered, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const gold2 = await page.evaluate(() => window.__UAIDZIN__.session.inventory.gold);
  if (gold2 === gold1) ok("gold persistiu após reload (" + gold2 + ")");
  else fail("gold divergiu " + gold1 + " vs " + gold2);

  const cipherCheck = await page.evaluate(() => {
    const id = window.__UAIDZIN__.session.saveService.getProfileId();
    const raw = localStorage.getItem("uaidzin.save." + id);
    if (!raw) return { ok: false, reason: "missing" };
    const name = window.__UAIDZIN__.session.character.name;
    if (raw.includes(name)) return { ok: false, reason: "plaintext_name" };
    try {
      const p = JSON.parse(raw);
      if (p.mode === "aes" || p.mode === "xor") return { ok: true, mode: p.mode };
    } catch {
      return { ok: false, reason: "parse" };
    }
    return { ok: false, reason: "not_envelope" };
  });
  if (cipherCheck.ok) ok("profile cifrado mode=" + cipherCheck.mode);
  else fail("ciphertext: " + cipherCheck.reason);

  const face = await page.locator("#player-face-img").getAttribute("src");
  if (face && /face-(tk|fm|bm|ht)\.png/i.test(face)) ok("HUD face=" + face);
  else fail("HUD face inválida " + face);

  const isolation = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    s.inventory.gold = 9000;
    s.inventory.items.length = 0;
    const item = {
      uid: "harness_ori_1",
      defId: "ori",
      name: "Ori Harness",
      rarity: "Comum",
      slot: "material",
      refine: 0,
      attackBonus: 0,
      defenseBonus: 0,
      stack: 5,
      sellValue: 1,
    };
    s.inventory.add(item);
    api.vault.depositGold(3000);
    api.vault.moveToVault("harness_ori_1");
    s.bags.unlock(1);
    s.buffs.add({ id: "harness_buff", remainingSec: 120, stacks: 1 });
    await api.save.persist();
    const vaultAfterA = api.vault.snapshot();
    const goldA = s.inventory.gold;
    const bagsA = s.bags.snapshot();
    const buffsA = s.buffs.snapshot().length;

    await api.account.deleteSlot(2);
    await api.account.createSlot({
      slotIndex: 2,
      classId: "FM",
      name: "HarnessFM",
      level: 3,
      gold: 111,
    });
    const switched = await api.account.loadSlot(2);
    if (!switched) return { ok: false, reason: "switch_b" };
    await api.save.persist();
    const goldB = s.inventory.gold;
    const vaultB = api.vault.snapshot();
    const invB = s.inventory.items.map((i) => i.uid);
    const nameB = s.character.name;
    const bagsB = s.bags.snapshot();
    const buffsB = s.buffs.snapshot().length;

    const back = await api.account.loadSlot(0);
    if (!back) return { ok: false, reason: "switch_a" };
    const goldBack = s.inventory.gold;
    const vaultBack = api.vault.snapshot();
    const bagsBack = s.bags.snapshot();
    const buffsBack = s.buffs.snapshot().some((b) => b.id === "harness_buff");
    const hpFull = s.character.hp === s.character.maxHp && s.character.mp === s.character.maxMp;

    return {
      ok: true,
      goldA,
      goldB,
      goldBack,
      vaultGold: vaultB.gold,
      vaultItem: vaultB.items.some((i) => i.uid === "harness_ori_1"),
      vaultGoldBack: vaultBack.gold,
      invBHasOri: invB.includes("harness_ori_1"),
      nameB,
      bagsA1: bagsA[1],
      bagsB1: bagsB[1],
      bagsBack1: bagsBack[1],
      buffsA,
      buffsB,
      buffsBack,
      hpFull,
      vaultAfterA: vaultAfterA.gold,
    };
  });

  if (!isolation.ok) fail("isolamento: " + isolation.reason);
  else {
    if (isolation.goldA === 6000) ok("char A ouro após depósito=" + isolation.goldA);
    else fail("char A ouro esperado 6000 got " + isolation.goldA);
    if (isolation.goldB === 111) ok("char B ouro isolado=" + isolation.goldB);
    else fail("char B ouro vazou " + isolation.goldB);
    if (isolation.goldBack === 6000) ok("char A ouro restaurado=" + isolation.goldBack);
    else fail("char A ouro após volta " + isolation.goldBack);
    if (isolation.vaultGold === 3000 && isolation.vaultGoldBack === 3000) ok("baú ouro compartilhado=3000");
    else fail("baú ouro " + isolation.vaultGold + "/" + isolation.vaultGoldBack);
    if (isolation.vaultItem && !isolation.invBHasOri) ok("item no baú compartilhado, fora do inv B");
    else fail("item baú/inv B");
    if (isolation.nameB === "HarnessFM") ok("nome B=" + isolation.nameB);
    else fail("nome B " + isolation.nameB);
    if (isolation.bagsA1 && !isolation.bagsB1 && isolation.bagsBack1) ok("bolsas por personagem");
    else fail("bolsas A/B/back " + isolation.bagsA1 + "/" + isolation.bagsB1 + "/" + isolation.bagsBack1);
    if (isolation.buffsA >= 1 && isolation.buffsB === 0 && isolation.buffsBack) ok("buffs por personagem");
    else fail("buffs A/B/back");
    if (isolation.hpFull) ok("HP/MP cheios ao trocar slot");
    else fail("HP/MP não cheios");
  }

  await page.evaluate(async () => {
    await window.__UAIDZIN__.save.wipeProfile();
  });
  ok("wipeProfile ok");

  await browser.close();
  if (failed) {
    console.error("SAVE_HARNESS_FAILED", failed);
    process.exit(1);
  }
  console.log("SAVE_HARNESS_PASSED");
}

main().catch((err) => {
  console.error("SAVE_FAIL", err);
  process.exit(1);
});
