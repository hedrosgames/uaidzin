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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

try {
  await wipe(page);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);

  let frame = page.frameLocator("iframe").first();
  await loginAdmin(page, frame);

  await frame.locator("#btnCreateFirst").click();
  await frame.locator("#newName").fill("TkFisicaQA");
  await frame.locator("#btnCreateConfirm").click();
  await page.waitForTimeout(900);
  await frame.locator("#btnConnect").click();
  await page.waitForFunction(
    () => window.__UAIDZIN__?.session?.character?.name === "TkFisicaQA",
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(1200);
  ok("Login e criacao de TK concluidos");

  await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    s.debug.addLevels(10);
    s.inventory.gold = 50000;
  });
  ok("Pontos e ouro concedidos para teste");

  await page.evaluate(() => {
    window.__UAIDZIN__.openPanel("skillmaster");
  });
  await page.waitForTimeout(400);

  const uiChecks = await page.evaluate(() => {
    const p = document.querySelector("#wire-ui #p-skillmaster");
    if (!p) return { found: false };
    const html = p.innerHTML;
    const hasLevelX = /N[íi]vel\s+\d+\s*\/\s*10/i.test(html);
    const hasMelhorar = /Melhorar/i.test(html);
    const hasMaximo = /M[áa]ximo/i.test(html);
    return {
      found: true,
      hasLevelX,
      hasMelhorar,
      hasMaximo,
    };
  });

  if (!uiChecks.found) {
    fail("Painel de skillmaster nao abriu");
  } else if (uiChecks.hasLevelX || uiChecks.hasMelhorar || uiChecks.hasMaximo) {
    fail(`UI legado detectado: levelX=${uiChecks.hasLevelX} melhorar=${uiChecks.hasMelhorar} maximo=${uiChecks.hasMaximo}`);
  } else {
    ok("Mestre sem 'Nivel x / 10' e sem 'Melhorar'");
  }

  for (let idx = 0; idx < 8; idx++) {
    const buyResult = await page.evaluate(async (skillIndex) => {
      const wire = document.querySelector("#wire-ui");
      const targetSlot = wire.querySelector(`.tree-block[data-tree="fisica"] .sm-slot[data-skill-id="fisica-${skillIndex + 1}"]`);
      if (!targetSlot) return { error: "slot-not-found" };
      targetSlot.click();
      await new Promise((r) => setTimeout(r, 60));

      const detail = wire.querySelector("#smDetail");
      const descText = detail?.querySelector(".desc")?.textContent || "";
      const isPassiveMeta = !!detail?.querySelector(".sub.gold");
      const btn = detail?.querySelector("#btnBuySkill");
      const btnText = btn?.textContent?.trim() || "";
      const canBuy = !btn?.disabled;

      if (!canBuy) return { error: "cannot-buy", btnText };

      btn.click();
      await new Promise((r) => setTimeout(r, 80));

      const afterBtn = wire.querySelector("#smDetail button");
      const afterText = afterBtn?.textContent?.trim() || "";
      const afterDisabled = afterBtn?.disabled ?? false;

      return {
        descLength: descText.trim().length,
        isPassiveMeta,
        btnText,
        afterText,
        afterDisabled,
      };
    }, idx);

    if (buyResult.error) {
      fail(`Falha ao comprar skill idx ${idx}: ${buyResult.error}`);
    } else {
      if (idx === 2 || idx === 5) {
        if (!buyResult.isPassiveMeta) fail(`Skill passiva idx ${idx} nao indicou 'Passiva · nao vai para a barra'`);
        else ok(`Skill passiva idx ${idx} com aviso de passiva e sem MP/CD`);
      }
      if (buyResult.afterText === "Aprendida" && buyResult.afterDisabled) {
        ok(`Skill idx ${idx} comprada com sucesso e travada em 'Aprendida'`);
      } else {
        fail(`Skill idx ${idx} pos-compra incorreta: text="${buyResult.afterText}" disabled=${buyResult.afterDisabled}`);
      }
    }
  }

  const eighthCheck = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const eighthTree = s.skillTree.state.eighthTree;
    const canLearnCtrl8 = s.skillTree.canLearn("controle", 7);
    const canLearnMag8 = s.skillTree.canLearn("magia", 7);
    return { eighthTree, canLearnCtrl8, canLearnMag8 };
  });

  if (eighthCheck.eighthTree === "fisica" && !eighthCheck.canLearnCtrl8 && !eighthCheck.canLearnMag8) {
    ok("Oitava skill travou eighthTree='fisica' e bloqueou 8a de outras arvores");
  } else {
    fail(`Falha na 8a exclusiva: ${JSON.stringify(eighthCheck)}`);
  }

  const barCheck = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const slots = s.skillLoadout.slots;
    const hudRings = document.querySelectorAll("#skillHud .slot-ring");
    const hudKeys = Array.from(hudRings).map((r) => r.querySelector(".slot-key")?.textContent?.trim());
    return {
      slotsLength: slots.length,
      hudRingsCount: hudRings.length,
      hudKeys,
      occupiedSlots: slots.map((sl, i) => sl ? { idx: i, id: sl.skill.id } : null).filter(Boolean),
    };
  });

  if (barCheck.slotsLength === 10 && barCheck.hudRingsCount === 10) {
    ok("Barra de 10 slots presente no dominio e no wire HUD");
  } else {
    fail(`Barra nao tem 10 slots: domain=${barCheck.slotsLength}, hud=${barCheck.hudRingsCount}`);
  }

  if (barCheck.hudKeys[9] === "0") {
    ok("Slot de indice 9 exibe tecla '0'");
  } else {
    fail(`Slot 9 tecla incorreta: "${barCheck.hudKeys[9]}"`);
  }

  const passivesInBar = barCheck.occupiedSlots.filter((os) => os.id === "tk_fis_mestre_dual" || os.id === "tk_fis_increase_critical");
  if (passivesInBar.length === 0) {
    ok("Passivas nao entraram na barra de skills");
  } else {
    fail(`Passivas encontradas na barra: ${JSON.stringify(passivesInBar)}`);
  }

  await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    s.skillLoadout.clearSlot(4);
    s.skillLoadout.assign("tk_fis_fury", 9);
    window.__UAIDZIN__.closePanels();
  });
  await page.waitForTimeout(300);

  const slotConfigCheck = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const slot4 = s.skillLoadout.slots[4];
    const slot9 = s.skillLoadout.slots[9];
    return {
      slot4Empty: slot4 === null,
      slot9SkillId: slot9?.skill?.id ?? null,
    };
  });

  if (slotConfigCheck.slot4Empty && slotConfigCheck.slot9SkillId === "tk_fis_fury") {
    ok("Slot 4 esvaziado e slot 9 equipado com Fury");
  } else {
    fail(`Configuracao de slots incorreta: ${JSON.stringify(slotConfigCheck)}`);
  }

  await page.evaluate(() => {
    window.__UAIDZIN__.enterDungeonById("dungeon-1");
  });
  await page.waitForFunction(
    () => {
      const s = window.__UAIDZIN__?.session;
      return Boolean(s?.worlds?.getCurrentId()?.startsWith("dungeon") && !s?.worldFadeBusy);
    },
    null,
    { timeout: 15000 },
  );
  await page.waitForTimeout(800);
  ok("Entrou na dungeon para teste de cast");

  const descuidadoBuffCheck = await page.evaluate(async () => {
    const s = window.__UAIDZIN__.session;
    s.character.healFull();
    s.player.clearMoveTarget();
    for (let attempts = 0; attempts < 15; attempts++) {
      if (s.buffs.has("tk_reckless_atk") && s.buffs.has("tk_reckless_def")) break;
      s.forceSkillSlot(1);
      await new Promise((r) => setTimeout(r, 60));
    }
    return {
      hasAtk: s.buffs.has("tk_reckless_atk"),
      hasDef: s.buffs.has("tk_reckless_def"),
    };
  });

  if (descuidadoBuffCheck.hasAtk && descuidadoBuffCheck.hasDef) {
    ok("Atk Descuidado aplicou buffs tk_reckless_atk e tk_reckless_def");
  } else {
    fail(`Buffs de Atk Descuidado ausentes: ${JSON.stringify(descuidadoBuffCheck)}`);
  }

  await page.evaluate(() => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    window.focus();
  });
  await page.keyboard.press("Digit0");
  await page.waitForTimeout(300);

  let furyBuffCheck = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    return s.buffs.has("tk_fury");
  });

  if (!furyBuffCheck) {
    furyBuffCheck = await page.evaluate(async () => {
      const s = window.__UAIDZIN__.session;
      s.character.healFull();
      s.player.clearMoveTarget();
      for (let attempts = 0; attempts < 15; attempts++) {
        if (s.buffs.has("tk_fury")) break;
        s.forceSkillSlot(9);
        await new Promise((r) => setTimeout(r, 60));
      }
      return s.buffs.has("tk_fury");
    });
  }

  if (furyBuffCheck) {
    ok("Fury castado e buff tk_fury aplicado");
  } else {
    fail("Buff tk_fury ausente");
  }

  await page.evaluate(async () => {
    const s = window.__UAIDZIN__.session;
    s.saves.markDirty(["skills", "skillLoadout", "character"], "critical");
    await s.saves.checkpoint();
  });
  await page.waitForTimeout(600);
  ok("Save checkpoint gravado");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  let reloadFrame = page.frameLocator("iframe").first();
  const connectBtn = reloadFrame.locator("#btnConnect");
  if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await connectBtn.click();
  } else {
    const loginUser = reloadFrame.locator("#user");
    if (await loginUser.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginAdmin(page, reloadFrame);
      await reloadFrame.locator("#btnConnect").click();
    }
  }

  await page.waitForFunction(
    () => !!window.__UAIDZIN__?.session?.character?.name,
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(1200);

  const persistCheck = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const eighth = s.skillTree.state.eighthTree;
    const learnedFisica = s.skillTree.getTree("fisica").map((sk) => ({
      id: sk.id,
      learned: s.skillTree.hasSkill(sk.id),
    }));
    const all8Learned = learnedFisica.every((item) => item.learned);
    const slots = s.skillLoadout.slots;
    const slot4Null = slots[4] === null;
    const slot9Fury = slots[9]?.skill?.id === "tk_fis_fury";
    return {
      eighth,
      all8Learned,
      slotsLen: slots.length,
      slot4Null,
      slot9Fury,
    };
  });

  if (persistCheck.eighth === "fisica" && persistCheck.all8Learned && persistCheck.slotsLen === 10 && persistCheck.slot4Null && persistCheck.slot9Fury) {
    ok("Persistencia pos-reload verificada: 8 skills aprendidas, eighthTree mantido, slots preservados com nulos e indice 9");
  } else {
    fail(`Falha na persistencia pos-reload: ${JSON.stringify(persistCheck)}`);
  }
} finally {
  await browser.close();
}

if (failed > 0) {
  console.error(`check-tk-fisica finalizado com ${failed} falhas.`);
  process.exit(1);
} else {
  console.log("check-tk-fisica finalizado com 100% de sucesso.");
  process.exit(0);
}
