import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed += 1;
  console.error("FAIL", m);
};

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function staticChecks() {
  const compose = read("game/src/data/composer/compose-formulas.ts") + (fs.existsSync(path.join(ROOT, "game/src/data/composer/compose-recipes.json")) ? read("game/src/data/composer/compose-recipes.json") : "");
  const service = read("game/src/domain/items/CompositionService.ts");
  const quests = read("game/src/data/quests/quest-definitions.ts");
  const qsvc = read("game/src/domain/quests/QuestService.ts");
  const wireComposer = read("game/src/ui/wire/composer.ts");
  const wireQuest = read("game/src/ui/wire/quest.ts");
  const session = read("game/src/app/CityGameSession.ts");

  if (!compose.includes("compose_plus7_lac") || (!compose.includes("1_000_000") && !compose.includes("1000000"))) {
    fail("C7i: fórmula compose_plus7_lac ausente");
  } else ok("C7i: fórmula no data");

  if (!service.includes("successChance") || !service.includes("targetRefine")) {
    fail("C7i: CompositionService incompleto");
  } else ok("C7i: CompositionService");

  if (!wireComposer.includes('recipeId: "compose_plus7_lac"') || !wireComposer.includes("Compôr")) {
    fail("C7i: wire sem bancada +7");
  } else ok("C7i: wire bancada");

  if (!quests.includes("q_mortal_kill_01") || !quests.includes("Primeiros passos")) {
    fail("C1i: quest mínima ausente");
  } else ok("C1i: quest def");

  if (!qsvc.includes("accept") || !qsvc.includes("recordKill")) {
    fail("C1i: QuestService incompleto");
  } else ok("C1i: QuestService");

  if (!wireQuest.includes("quest-list") || !wireQuest.includes("createQuestPanel")) {
    fail("C1i: wire painel quests vazio");
  } else ok("C1i: wire UI quests");

  if (!session.includes("applyQuestKillProgress") || !session.includes("tryCompose")) {
    fail("sessão sem compose/quest hooks");
  } else ok("sessão hooks");
}

staticChecks();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(45000);

try {
  await page.goto(BASE + "/tools/save-wipe.html?auto=all", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);
  const frame = page.frameLocator("iframe").first();
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
  await frame.locator("#btnCreateFirst").click();
  await frame.locator("#newName").fill("ComposeQ");
  await frame.locator("#btnCreateConfirm").click();
  await page.waitForTimeout(900);
  await frame.locator("#btnConnect").click();
  await page.waitForFunction(() => window.__UAIDZIN__?.session?.character?.name === "ComposeQ", null, {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);

  const composeResult = await page.evaluate(() => {
    const api = window.__UAIDZIN__;
    const s = api.session;
    s.inventory.items.length = 0;
    s.inventory.gold = 1_000_000;
    s.inventory.add({
      uid: "item_test_lac",
      defId: "mat_lac",
      name: "Poeira de Lac",
      rarity: "Comum",
      slot: "material",
      refine: 0,
      attackBonus: 0,
      defenseBonus: 0,
      stack: 1,
      sellValue: 8,
    });
    s.inventory.add({
      uid: "item_test_sword",
      defId: "espada_curta",
      name: "Espada Curta",
      rarity: "Comum",
      slot: "weapon",
      refine: 2,
      attackBonus: 4,
      defenseBonus: 0,
      stack: 1,
      sellValue: 10,
    });
    const blocked = api.composer.canAttempt("compose_plus7_lac", "item_test_sword");
    const failRoll = s.tryCompose("compose_plus7_lac", "item_test_sword", () => 0.9);
    const afterFail = {
      gold: s.inventory.gold,
      lac: s.inventory.countMaterial("mat_lac"),
      refine: s.inventory.items.find((i) => i.uid === "item_test_sword")?.refine,
    };
    s.inventory.gold = 1_000_000;
    s.inventory.add({
      uid: "item_test_lac2",
      defId: "mat_lac",
      name: "Poeira de Lac",
      rarity: "Comum",
      slot: "material",
      refine: 0,
      attackBonus: 0,
      defenseBonus: 0,
      stack: 1,
      sellValue: 8,
    });
    const winRoll = s.tryCompose("compose_plus7_lac", "item_test_sword", () => 0.1);
    const afterWin = {
      gold: s.inventory.gold,
      lac: s.inventory.countMaterial("mat_lac"),
      refine: s.inventory.items.find((i) => i.uid === "item_test_sword")?.refine,
    };
    return { blocked, failRoll, afterFail, winRoll, afterWin };
  });

  if (!composeResult.blocked.ok) fail("C7i: canAttempt deveria ok com mat+ouro+item");
  else ok("C7i: canAttempt ok");

  if (!composeResult.failRoll.attempted || composeResult.failRoll.success) {
    fail("C7i: falha 50% não consumiu sem aplicar +7");
  } else if (
    composeResult.afterFail.gold !== 0 ||
    composeResult.afterFail.lac !== 0 ||
    composeResult.afterFail.refine !== 2
  ) {
    fail("C7i: falha deveria consumir mat+ouro e manter refine=" + JSON.stringify(composeResult.afterFail));
  } else ok("C7i: falha consome e mantém item");

  if (!composeResult.winRoll.attempted || !composeResult.winRoll.success) {
    fail("C7i: sucesso não aplicou");
  } else if (composeResult.afterWin.refine !== 7 || composeResult.afterWin.gold !== 0) {
    fail("C7i: sucesso refine/ouro " + JSON.stringify(composeResult.afterWin));
  } else ok("C7i: sucesso +7 absoluto");

  await page.evaluate(() => window.__UAIDZIN__.openPanel("composer"));
  await page.waitForTimeout(300);
  const composerUi = await page.evaluate(() => {
    const host = document.querySelector("#wire-ui");
    const card = host?.querySelector("#composeCatalog .compose-card:not(.locked)");
    return {
      open: !!host?.querySelector("#p-composer:not(.is-closed)"),
      plus7: card?.querySelector(".ttl")?.textContent || "",
    };
  });
  if (!composerUi.open || composerUi.plus7 !== "+7") fail("C7i: painel compositor sem card +7");
  else ok("C7i: UI card +7");

  const questResult = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    api.closePanels();
    api.openPanel("quest");
    await new Promise((r) => setTimeout(r, 200));
    const listBefore = api.quests.list();
    const accept = api.quests.accept("q_mortal_kill_01");
    const listActive = api.quests.list();
    for (let i = 0; i < 10; i++) api.session.quests.recordKill();
    const completed = api.quests.list().find((q) => q.id === "q_mortal_kill_01");
    const reaccept = api.quests.accept("q_mortal_kill_01");
    await api.persistSave();
    const saved = api.session.progressState.quests["q_mortal_kill_01"];
    const detail = document.querySelector("#wire-ui #questDetail .ttl")?.textContent || "";
    return { listBefore, accept, listActive, completed, reaccept, saved, detail };
  });

  if (!questResult.listBefore.some((q) => q.id === "q_mortal_kill_01" && q.canAccept)) {
    fail("C1i: missão não disponível no início");
  } else ok("C1i: missão disponível");

  if (!questResult.accept.ok || questResult.listActive.find((q) => q.id === "q_mortal_kill_01")?.status !== "active") {
    fail("C1i: aceitar falhou");
  } else ok("C1i: aceitar → active");

  if (questResult.completed?.status !== "done" || questResult.completed?.step !== 10) {
    fail("C1i: kill N não concluiu " + JSON.stringify(questResult.completed));
  } else ok("C1i: 10 kills → done");

  if (questResult.reaccept.ok) fail("C1i: história não deveria reaceitar");
  else ok("C1i: não reaceita");

  if (questResult.saved?.status !== "done") fail("C1i: save sem quest done");
  else ok("C1i: save persiste done");

  if (!/Primeiros/.test(questResult.detail)) fail("C1i: detalhe UI sem título");
  else ok("C1i: UI detalhe");
} catch (err) {
  fail(String(err && err.message ? err.message : err));
} finally {
  await browser.close();
}

if (failed) {
  console.error("FAIL check-c7i-c1i (" + failed + ")");
  process.exit(1);
}
console.log("PASS check-c7i-c1i");
