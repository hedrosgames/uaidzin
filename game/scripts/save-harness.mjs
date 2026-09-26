import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
const SECTIONS = ["meta", "character", "skills", "skillLoadout", "equipment", "inventory", "bags", "buffs", "progress", "options"];
let failed = 0;

function ok(msg) {
  console.log("SAVE_OK", msg);
}
function fail(msg) {
  failed += 1;
  console.error("SAVE_FAIL", msg);
}

async function readSections(page, profileId) {
  return page.evaluate(
    ({ id, sections }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("uaidzin", 3);
        req.onerror = () => reject(new Error("idb_open"));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(["sections", "save"], "readonly");
          const out = { sections: {}, legacy: null };
          for (const section of sections) {
            const r = tx.objectStore("sections").get("profile:" + id + ":" + section);
            r.onsuccess = () => {
              if (typeof r.result === "string") out.sections[section] = r.result;
            };
          }
          const legacy = tx.objectStore("save").get("profile:" + id);
          legacy.onsuccess = () => {
            out.legacy = legacy.result ?? null;
          };
          tx.oncomplete = () => {
            db.close();
            resolve(out);
          };
          tx.onerror = () => reject(new Error("idb_read"));
        };
      }),
    { id: profileId, sections: SECTIONS },
  );
}

async function selectFirstSlot(page, frame) {
  await frame.locator(".slot, .char, #slotList button, #slotList .slot-card").first().waitFor({ timeout: 20000 }).catch(() => {});
  const slotCards = frame.locator("#slotList .slot-card");
  const n = await slotCards.count();
  if (n > 0) {
    await slotCards.nth(0).click();
    await page.waitForTimeout(400);
  }
  return n;
}

async function waitEntered(page) {
  await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.()?.entered, null, { timeout: 60000 });
  await page.waitForTimeout(500);
}

function failPutInPage() {
  return `
    window.__harnessPut = window.__harnessPut || IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "sections") throw new DOMException("quota", "QuotaExceededError");
      return window.__harnessPut.apply(this, args);
    };
  `;
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
  await page.addScriptTag({ url: BASE + "/boot/assets/save-store.js" });
  const seededV3 = await page.evaluate(async () => {
    const store = window.UaidzinSave;
    const session = store.getSession();
    if (!session) return false;
    const data = (await store.loadSave(session)) || {};
    const slots = Array.isArray(data.slots) ? data.slots.slice(0, 4) : [];
    while (slots.length < 4) slots.push(null);
    slots[3] = {
      profileId: session.user + ":slot:3",
      classId: "TK",
      name: "Veterano",
      level: 50,
      gold: 999,
      resets: 2,
      evolution: "Mortal",
      attrs: { FOR: 30, DES: 5, CONS: 20, INT: 5 },
      trees: { controle: 0, magia: 0, fisica: 4 },
      spec: { controle: 0, magia: 0, fisica: 0 },
    };
    await store.saveData(session, { slots, vault: data.vault || { gold: 0, items: [] } });
    return true;
  });
  if (seededV3) ok("resumo de slot v3 (sem saveVersion) semeado no slot 3");
  else fail("não semeou resumo v3");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const n = await selectFirstSlot(page, frame);
  if (n > 0) ok("selecionou slot 0");
  else fail("nenhum slot na seleção");

  const connect = frame.locator("#btnConnect");
  if (!(await connect.isVisible().catch(() => false))) {
    const nameInput = frame.locator("#newName");
    if (!(await nameInput.isVisible().catch(() => false))) {
      const createFirst = frame.locator("#btnCreateFirst");
      if (await createFirst.isVisible().catch(() => false)) await createFirst.click();
    }
    await nameInput.waitFor({ state: "visible", timeout: 10000 });
    await nameInput.fill("Harna");
    await frame.locator("#btnCreateConfirm").click();
    await page.waitForTimeout(500);
    ok("criou personagem para entrar");
  }
  await connect.waitFor({ state: "visible", timeout: 15000 });
  await connect.click();

  await waitEntered(page);
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

  const profileId = await page.evaluate(() => window.__UAIDZIN__.session.saveService.getProfileId());
  const charName = await page.evaluate(() => window.__UAIDZIN__.session.character.name);
  const stored = await readSections(page, profileId);
  const missing = SECTIONS.filter((section) => !stored.sections[section]);
  if (!missing.length) ok("perfil v4 gravado nas 10 seções profile:" + profileId + ":*");
  else fail("seções ausentes: " + missing.join(","));
  const modes = new Set();
  let plaintext = false;
  for (const blob of Object.values(stored.sections)) {
    if (blob.includes(charName) || blob.includes("saveVersion")) plaintext = true;
    try {
      modes.add(JSON.parse(blob).mode);
    } catch {
      modes.add("parse");
    }
  }
  if (!plaintext && [...modes].every((m) => m === "aes" || m === "xor")) ok("seções cifradas mode=" + [...modes].join(","));
  else fail("seção em texto puro ou fora do envelope: " + [...modes].join(","));
  const legacyLs = await page.evaluate((id) => localStorage.getItem("uaidzin.save." + id), profileId);
  if (stored.legacy === null && legacyLs === null) ok("chaves v3 do perfil ausentes depois do checkpoint v4");
  else fail("chaves v3 ainda presentes");

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

  const idbFailOnce = (clearMirror) => page.evaluate(async (clear) => {
    const api = window.__UAIDZIN__;
    const id = api.session.saveService.getProfileId();
    api.save.writeMirror();
    const lsKeys = ["uaidzin.mirror." + id];
    const stash = lsKeys.map((k) => localStorage.getItem(k));
    if (clear) lsKeys.forEach((k) => localStorage.removeItem(k));
    const beforeWrites = api.save.writeCount();
    const orig = IDBObjectStore.prototype.get;
    let armed = true;
    IDBObjectStore.prototype.get = function (key) {
      if (armed && this.name === "sections") {
        armed = false;
        let onerror = null;
        return {
          result: undefined,
          error: new DOMException("idb_read_failed", "UnknownError"),
          set onsuccess(_fn) {},
          get onsuccess() {
            return null;
          },
          set onerror(fn) {
            onerror = fn;
            queueMicrotask(() => {
              if (typeof onerror === "function") onerror(new Event("error"));
            });
          },
          get onerror() {
            return onerror;
          },
        };
      }
      return orig.call(this, key);
    };
    let status = "throw";
    try {
      const result = await api.session.loadSave();
      status = result && result.status ? result.status : String(result);
    } catch {
      status = "throw";
    } finally {
      IDBObjectStore.prototype.get = orig;
    }
    const writes = api.save.writeCount() - beforeWrites;
    const lsUntouched = clear ? lsKeys.every((k) => localStorage.getItem(k) === null) : lsKeys.every((k, i) => localStorage.getItem(k) === stash[i]);
    lsKeys.forEach((k, i) => {
      if (stash[i] !== null) localStorage.setItem(k, stash[i]);
    });
    const after = await api.session.loadSave();
    return { status, writes, lsUntouched, hadMirror: stash[0] !== null, after: after.status };
  }, clearMirror);

  const withMirror = await idbFailOnce(false);
  if (withMirror.status === "error" && withMirror.writes === 0 && withMirror.lsUntouched && withMirror.hadMirror && withMirror.after === "found") {
    ok("leitura IDB falha 1× com espelho vira erro, não grava e a leitura seguinte carrega");
  } else {
    fail("idb fail com espelho: " + JSON.stringify(withMirror));
  }

  const noMirror = await idbFailOnce(true);
  if (noMirror.status === "error" && noMirror.writes === 0 && noMirror.lsUntouched && noMirror.after === "found") {
    ok("leitura IDB falha 1× sem espelho vira erro, não grava e a leitura seguinte carrega");
  } else {
    fail("idb fail sem espelho: " + JSON.stringify(noMirror));
  }

  const v3 = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    const previous = s.saveService.getProfileId();
    const target = previous.replace(/:slot:\d+$/, ":slot:3");
    localStorage.setItem("uaidzin.save." + target, JSON.stringify({ saveVersion: 3, character: { name: "Veterano", level: 50 } }));
    await new Promise((resolve) => {
      const req = indexedDB.open("uaidzin", 3);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("save", "readwrite");
        tx.objectStore("save").put(JSON.stringify({ saveVersion: 3 }), "profile:" + target);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    const summary = (await api.account.listSlots())[3];
    const beforeWrites = api.save.writeCount();
    s.saveService.setProfileId(target);
    const result = await s.loadSave();
    s.saveService.setProfileId(previous);
    const writes = api.save.writeCount() - beforeWrites;
    const back = await s.loadSave();
    return { summaryLevel: summary?.level, status: result.status, writes, back: back.status };
  });
  if (v3.summaryLevel === 50 && v3.status === "absent" && v3.writes === 0 && v3.back === "found") {
    ok("save v3 com progresso no resumo vira absent, sem gravar");
  } else {
    fail("save v3: " + JSON.stringify(v3));
  }

  const lostV4 = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    const previous = s.saveService.getProfileId();
    const target = previous.replace(/:slot:\d+$/, ":slot:2");
    await new Promise((resolve) => {
      const req = indexedDB.open("uaidzin", 3);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("sections", "readwrite");
        tx.objectStore("sections").delete(IDBKeyRange.bound("profile:" + target + ":", "profile:" + target + ":￿"));
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    const beforeWrites = api.save.writeCount();
    s.saveService.setProfileId(target);
    const result = await s.loadSave();
    s.saveService.setProfileId(previous);
    const writes = api.save.writeCount() - beforeWrites;
    const back = await s.loadSave();
    return { status: result.status, writes, back: back.status };
  });
  if (lostV4.status === "error" && lostV4.writes === 0 && lostV4.back === "found") {
    ok("perfil v4 sumido com progresso no resumo vira error, sem gravar");
  } else {
    fail("perfil v4 sumido: " + JSON.stringify(lostV4));
  }

  await page.evaluate(failPutInPage());
  const persistent = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    s.inventory.gold += 5;
    const t0 = performance.now();
    s.saves.markDirty("inventory", "critical");
    await s.saves.checkpoint();
    const ms = Math.round(performance.now() - t0);
    const result = {
      ms,
      status: api.save.status(),
      pending: api.save.pendingCritical(),
      hud: document.getElementById("save-status")?.textContent || "",
    };
    IDBObjectStore.prototype.put = window.__harnessPut;
    return result;
  });
  if (persistent.status === "error" && persistent.pending && persistent.hud.includes("pendente")) {
    ok("falha de escrita termina em " + persistent.ms + " ms e deixa o crítico pendente no HUD (" + persistent.hud + ")");
  } else {
    fail("falha persistente: " + JSON.stringify(persistent));
  }
  try {
    await page.waitForFunction(() => !window.__UAIDZIN__.save.pendingCritical(), null, { timeout: 30000 });
    ok("retry com backoff gravou o crítico pendente");
  } catch {
    fail("crítico pendente não gravou no retry");
  }

  await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    api.session.inventory.gold = 100;
    await api.save.persist();
  });
  await page.evaluate(failPutInPage());
  const mirror = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    const id = s.saveService.getProfileId();
    s.inventory.gold = 250;
    s.saves.markDirty("inventory", "critical");
    await s.saves.checkpoint();
    api.save.writeMirror();
    s.inventory.gold = 0;
    const loaded = await s.loadSave();
    const goldLoaded = s.inventory.gold;
    IDBObjectStore.prototype.put = window.__harnessPut;
    await s.saves.checkpoint();
    localStorage.removeItem("uaidzin.mirror." + id);
    s.inventory.gold = 0;
    const again = await s.loadSave();
    return { loaded: loaded.status, goldLoaded, again: again.status, goldIdb: s.inventory.gold, pending: api.save.pendingCritical() };
  });
  if (mirror.loaded === "found" && mirror.goldLoaded === 250 && mirror.again === "found" && mirror.goldIdb === 250 && !mirror.pending) {
    ok("espelho mais novo vence o IDB e é regravado nas seções");
  } else {
    fail("espelho: " + JSON.stringify(mirror));
  }

  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.waitForTimeout(300);
  await page.evaluate(failPutInPage());
  const loadEvent = page.waitForEvent("load", { timeout: 20000 }).catch(() => null);
  await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const start = performance.now();
    window.addEventListener("pagehide", () => {
      sessionStorage.setItem(
        "harness_leave",
        JSON.stringify({
          ms: Math.round(performance.now() - start),
          toast: document.getElementById("ui-toast")?.textContent || "",
        }),
      );
    });
    s.inventory.gold += 3;
    s.saves.markDirty("inventory", "critical");
    document.getElementById("btn-change-character").click();
  });
  await loadEvent;
  await page.waitForTimeout(800);
  const leave = await page.evaluate(() => JSON.parse(sessionStorage.getItem("harness_leave") || "null"));
  if (leave && leave.ms <= 3000 && leave.toast.includes("Falha ao salvar")) {
    ok("leaveToBoot com storage falhando voltou em " + leave.ms + " ms com aviso");
  } else {
    fail("leaveToBoot: " + JSON.stringify(leave));
  }

  await selectFirstSlot(page, frame);
  await connect.waitFor({ state: "visible", timeout: 15000 });
  await connect.click();
  await waitEntered(page);

  await page.evaluate(failPutInPage());
  const wiped = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    const id = s.saveService.getProfileId();
    s.inventory.gold += 7;
    s.saves.markDirty("inventory", "critical");
    s.saves.markDirty("character", "deferred");
    await s.saves.checkpoint();
    const armed = api.save.pendingCritical();
    await api.save.wipeProfile();
    IDBObjectStore.prototype.put = window.__harnessPut;
    await new Promise((resolve) => setTimeout(resolve, 3500));
    return { id, armed, pending: api.save.pendingCritical(), mirror: localStorage.getItem("uaidzin.mirror." + id) };
  });
  const afterWipe = await readSections(page, wiped.id);
  if (wiped.armed && !wiped.pending && !Object.keys(afterWipe.sections).length && wiped.mirror === null) {
    ok("wipe com flush pendente cancela o retry e não ressuscita o perfil");
  } else {
    fail("wipe com flush pendente: " + JSON.stringify({ ...wiped, left: Object.keys(afterWipe.sections) }));
  }

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
