import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
const evidenceDir = process.env.UAIDZIN_EVIDENCE_DIR;
const failures = [];
const browser = await chromium.launch({ headless: true });

async function ready(page, classId) {
  await page.waitForFunction(id => {
    const api = window.__UAIDZIN__;
    return api?.getSnapshot?.().mode === "CITY" && api.session.skillTree.state.classId === id;
  }, classId, { timeout: 60000 });
  await page.evaluate(() => window.__UAIDZIN__.renderer.setQuality("baixo"));
  await page.locator("#uaidzin-loading-screen").waitFor({ state: "hidden", timeout: 60000 });
}

async function openMaster(page) {
  await page.evaluate(() => window.__UAIDZIN__.openPanel("skillmaster"));
  await page.locator("#wire-ui #p-skillmaster").waitFor({ state: "visible" });
}

async function selectSkill(page, tree, index) {
  await page.locator(`#p-skillmaster [data-tree="${tree}"] [data-skill-id="${tree}-${index + 1}"]`).evaluate(element => element.click());
}

async function resetTree(page) {
  await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    window.__UAIDZIN__.closePanels();
    s.skillTree.resetSkills();
    s.skillTree.grantSkillPoints(1000);
    s.skillLoadout.applySaved(null);
    s.skillLoadout.refresh();
    s.combat.invalidatePassives();
    s.buffs.clear();
    s.form.clear();
    s.summons.clear();
    s.inventory.gold = 500000;
    s.attackMode = "off";
  });
  await openMaster(page);
}

async function checkTree(page, classId, tree, navigation) {
  await resetTree(page);
  const defs = await page.evaluate(treeId => window.__UAIDZIN__.session.skillTree.getTree(treeId), tree);
  assert.equal(defs.length, 8, `${classId}/${tree}: oito skills`);

  await selectSkill(page, tree, 1);
  assert.equal(await page.locator("#btnBuySkill").isDisabled(), true, "pré-requisito bloqueia compra");
  await page.evaluate(() => { window.__UAIDZIN__.session.inventory.gold = 0; });
  await selectSkill(page, tree, 0);
  assert.equal(await page.locator("#btnBuySkill").isDisabled(), true, "ouro insuficiente bloqueia compra");
  await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    s.inventory.gold = 500000;
    s.skillTree.state.skillPoints = 0;
  });
  await selectSkill(page, tree, 0);
  assert.equal(await page.locator("#btnBuySkill").isDisabled(), true, "pontos insuficientes bloqueiam compra");
  await page.evaluate(() => { window.__UAIDZIN__.session.skillTree.state.skillPoints = 1000; });

  for (const [index, skill] of defs.entries()) {
    await selectSkill(page, tree, index);
    assert.equal(await page.locator("#smDetail .ttl").textContent(), skill.name, "nome real no Mestre");
    assert.equal(await page.locator("#smDetail .desc").textContent(), skill.desc, "descrição real no Mestre");
    assert.ok(skill.desc?.length > skill.name.length, "descrição explica efeito");
    const image = page.locator(`#p-skillmaster [data-skill-id="${tree}-${index + 1}"] img`);
    await page.waitForFunction(selector => document.querySelector(selector)?.naturalWidth > 0, `#p-skillmaster [data-skill-id="${tree}-${index + 1}"] img`, { timeout: 10000 });
    assert.ok(await image.evaluate(img => img.naturalWidth > 0), `ícone de ${skill.id}`);
    if (skill.kind === "passive") {
      assert.match(await page.locator("#smDetail").textContent(), /Passiva · não vai para a barra/);
    }
    const before = await page.evaluate(index => {
      const api = window.__UAIDZIN__;
      return {
        gold: api.session.inventory.gold,
        points: api.session.skillTree.state.skillPoints,
        goldCost: api.wire.skillGoldCost(index),
        pointsCost: api.wire.skillPointsCost(index),
      };
    }, index);
    assert.equal(await page.locator("#btnBuySkill").isEnabled(), true, `compra ${skill.id}`);
    await page.locator("#btnBuySkill").evaluate(element => element.click());
    const after = await page.evaluate(id => {
      const s = window.__UAIDZIN__.session;
      return { learned: s.skillTree.hasSkill(id), gold: s.inventory.gold, points: s.skillTree.state.skillPoints };
    }, skill.id);
    assert.equal(after.learned, true, skill.id);
    assert.equal(after.gold, before.gold - before.goldCost, "débito de ouro");
    assert.equal(after.points, before.points - before.pointsCost, "débito de pontos");
    assert.equal(await page.locator("#smDetail button").textContent(), "Aprendida");
    assert.equal(await page.locator("#smDetail button").isDisabled(), true, "recompra bloqueada");
  }

  const acquired = await page.evaluate(treeId => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    return {
      eighth: s.skillTree.state.eighthTree,
      learned: [...s.skillTree.state.learned],
      bar: api.wire.getSkillBar(),
      hudSlots: document.querySelectorAll("#skillHud .slot-ring").length,
      othersBlocked: ["fisica", "controle", "magia"].filter(id => id !== treeId).every(id => !s.skillTree.canLearnEighthInTree(id)),
    };
  }, tree);
  assert.equal(acquired.eighth, tree);
  assert.equal(acquired.othersBlocked, true);
  assert.equal(acquired.bar.length, 10);
  assert.equal(acquired.hudSlots, 10);
  assert.deepEqual(acquired.bar.filter(slot => slot.skillId).map(slot => slot.skillId), defs.filter(skill => skill.kind !== "passive").map(skill => skill.id));

  const first = defs.find(skill => skill.kind !== "passive");
  await page.evaluate(async id => {
    const api = window.__UAIDZIN__;
    api.closePanels();
    api.session.skillLoadout.assign(id, 9);
    api.session.skillLoadout.slots.forEach(slot => { if (slot) slot.auto = false; });
    await api.enterDungeonById("dungeon-1");
  }, first.id);
  await page.waitForFunction(() => {
    const s = window.__UAIDZIN__?.session;
    return s?.worlds.getCurrentId() === "dungeon-1" && !s.worldFadeBusy;
  }, null, { timeout: 60000 });
  await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    s.enemies.enemies.length = 0;
    s.character.maxMp = 1000;
    s.character.mp = 1000;
    s.character.healFull();
    s.player.clearMoveTarget();
    s.skillLoadout.resetCooldowns();
    document.activeElement?.blur();
  });
  await page.keyboard.press("Digit0");
  await page.waitForFunction(() => window.__UAIDZIN__?.session.skillLoadout.slots[9]?.cd > 0, null, { timeout: 10000 });
  const cast = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    return { mp: s.character.mp, cd: s.skillLoadout.slots[9].cd, id: s.skillLoadout.slots[9].skill.id };
  });
  assert.equal(cast.id, first.id);
  assert.ok(cast.mp < 1000 && cast.mp >= 1000 - first.mp, "ativação manual consome mana real");
  assert.ok(cast.cd > 0 && cast.cd <= first.cooldown, "ativação manual inicia cooldown real");
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    await api.toCity();
    await api.persistSave();
  });
  await ready(page, classId);
  const expected = await page.evaluate(() => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    return { learned: [...s.skillTree.state.learned], eighth: s.skillTree.state.eighthTree, gold: s.inventory.gold, points: s.skillTree.state.skillPoints, bar: api.wire.getSkillBar().map(slot => ({ id: slot.skillId, auto: slot.auto })) };
  });
  navigation.expected += 1;
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready(page, classId);
  const restored = await page.evaluate(() => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    return { learned: [...s.skillTree.state.learned], eighth: s.skillTree.state.eighthTree, gold: s.inventory.gold, points: s.skillTree.state.skillPoints, bar: api.wire.getSkillBar().map(slot => ({ id: slot.skillId, auto: slot.auto })) };
  });
  assert.deepEqual(restored, expected, "reload preserva skills, oitava, ouro, pontos e slots esparsos");
  if (evidenceDir) {
    await openMaster(page);
    await selectSkill(page, tree, 7);
    await page.screenshot({ path: path.join(evidenceDir, `habilidades-${classId}-${tree}.png`) });
  }
  console.log(`OK ${classId}/${tree}: 8 compras, ícones, descrição, requisitos, mana, recarga, barra e reload`);
}

try {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  for (const classId of ["BM", "HT", "FM"]) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const navigation = { expected: 1, unexpected: 0 };
    page.on("framenavigated", frame => {
      if (frame !== page.mainFrame()) return;
      if (navigation.expected > 0) navigation.expected -= 1;
      else navigation.unexpected += 1;
    });
    page.on("pageerror", error => failures.push(`${classId}: ${error.message}`));
    await page.addInitScript(id => {
      window.requestAnimationFrame = callback => window.setTimeout(() => callback(performance.now()), 50);
      window.cancelAnimationFrame = handle => window.clearTimeout(handle);
      window.__UAIDZIN_SKIP_BOOT__ = { id: "admin:slot:0", name: "ClassSkillsQA", classId: id, level: 1, evolution: "Mortal", gold: 0, attrs: { FOR: 5, DES: 5, CONS: 5, INT: 5 } };
    }, classId);
    try {
      await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
      await ready(page, classId);
      const login = await page.evaluate(async () => window.__UAIDZIN__.login("admin", "admin"));
      assert.equal(login.ok, true, "login lab em contexto isolado");
      for (const tree of ["fisica", "magia", "controle"]) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const beforeNavigation = navigation.unexpected;
          const beforeFailures = failures.length;
          try {
            await checkTree(page, classId, tree, navigation);
            break;
          } catch (error) {
            const navigated = navigation.unexpected > beforeNavigation || /Execution context was destroyed/.test(error.message);
            if (attempt === 0 && navigated) {
              failures.splice(beforeFailures);
              await ready(page, classId);
              continue;
            }
            failures.push(`${classId}/${tree}: ${error.message}`);
            console.error(`FAIL ${classId}/${tree}: ${error.message}`);
            break;
          }
        }
      }
    } catch (error) {
      failures.push(`${classId}: ${error.message}`);
      console.error(`FAIL ${classId}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log("PASSOU: nove árvores, 72 skills compradas pela UI e nove reloads em saves isolados.");
}
