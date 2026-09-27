/**
 * Bot Playwright headed — joga o UAIDZIN em loop (classe, skills, atributos, dungeons).
 * Uso: node scripts/bot-play.mjs [--base URL] [--max-level 150] [--timeout-min 120] [--speed 10]
 * Requer: npm run dev + chromium do Playwright.
 */
import { chromium } from "playwright";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const BASE = arg("base", "http://127.0.0.1:5173/");
const MAX_LEVEL = Number(arg("max-level", "150"));
const TIMEOUT_MIN = Number(arg("timeout-min", "120"));
const SPEED_RAW = Number(arg("speed", "10"));
const SPEED = SPEED_RAW >= 10 ? 10 : SPEED_RAW >= 4 ? 4 : SPEED_RAW >= 2 ? 2 : 1;
const CLASSES = ["TK", "FM", "BM", "HT"];

const started = Date.now();
let pageErrors = 0;

function elapsedMin() {
  return (Date.now() - started) / 60000;
}

function log(...args) {
  const t = elapsedMin().toFixed(1);
  console.log(`[bot ${t}m]`, ...args);
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", (err) => {
  pageErrors += 1;
  console.error("PAGEERROR", err.message);
});

async function snap() {
  return page.evaluate(() => window.__UAIDZIN__.getSnapshot());
}

async function waitSnap(pred, timeoutMs = 8000, label = "snap") {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await snap();
    if (pred(s)) return s;
    await page.waitForTimeout(80);
  }
  throw new Error(`timeout esperando: ${label}`);
}

log("abre", BASE);
const classId = CLASSES[Math.floor(Math.random() * CLASSES.length)];
await page.addInitScript((cid) => {
  window.__UAIDZIN_SKIP_BOOT__ = {
    id: "bot:slot:0",
    name: "Bot",
    classId: cid,
    level: 1,
    evolution: "Mortal",
    gold: 500,
    attrs: { FOR: 12, DES: 12, CONS: 12, INT: 12 },
  };
}, classId);
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForFunction(() => !!window.__UAIDZIN__, null, { timeout: 20000 });

await page.evaluate(() => window.__UAIDZIN__.clearSave());
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__UAIDZIN__, null, { timeout: 20000 });
await page.waitForTimeout(400);

let s = await snap();
log("classe", classId, "modo", s.mode);
const skipLock = await page.evaluate(async () =>
  (await navigator.locks.query()).held.some((l) => l.name.startsWith("uaidzin:account:")),
);
if (!skipLock) throw new Error("lock de conta não adquirido pelo skip");

// 10x
await page.evaluate((n) => window.__UAIDZIN__.setTimeScale(n), SPEED);
s = await snap();
if (s.timeScale !== SPEED) throw new Error(`timeScale esperado ${SPEED}, veio ${s.timeScale}`);
log("timeScale", s.timeScale);

// Guarda do Portal (painel vazio por enquanto) — entrada real via enterDungeon
await page.evaluate(() => window.__UAIDZIN__.toCity());
await page.waitForTimeout(150);
await page.evaluate(() => window.__UAIDZIN__.teleportPlayer(0, -10));
await page.waitForTimeout(100);
const opened = await page.evaluate(() => window.__UAIDZIN__.openInteractionById("npc-portal-guard"));
if (!opened) log("aviso: npc-portal-guard não abriu via openInteractionById");
await page.waitForTimeout(150);
const panelVisible = await page.evaluate(() => {
  const el = document.querySelector("#wire-ui #p-portal");
  return !!el && !el.classList.contains("is-closed");
});
log("painel guarda portal", panelVisible);
await page.evaluate(() => window.__UAIDZIN__.closePanels());
await page.waitForTimeout(80);
await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
await page.waitForTimeout(250);
s = await snap();
if (s.mode !== "DUNGEON") {
  await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
  await page.waitForTimeout(250);
  s = await snap();
}
log("entrou dungeon", s.mode, s.world);

// Também visita 1 NPC (placeholder) antes do farm longo
await page.evaluate(() => window.__UAIDZIN__.toCity());
await page.waitForTimeout(120);
await page.evaluate(() => window.__UAIDZIN__.teleportPlayer(8, 2));
await page.waitForTimeout(80);
await page.evaluate(() => window.__UAIDZIN__.openInteractionById("npc-merchant"));
await page.waitForTimeout(150);
const npcOpen = await page.evaluate(() => {
  const shop = document.querySelector("#wire-ui #p-shop");
  const inv = document.querySelector("#wire-ui #p-inv");
  return (
    !!shop &&
    !shop.classList.contains("is-closed") &&
    !!inv &&
    !inv.classList.contains("is-closed")
  );
});
log("loja mercador + inventário", npcOpen);
await page.evaluate(() => window.__UAIDZIN__.closePanels());
await page.waitForTimeout(120);

// Loop principal
let runs = 0;
let interactionsOpened = panelVisible ? 1 : 0;
if (npcOpen) interactionsOpened += 1;

async function spendAndLearn() {
  const before = await snap();
  if (before.skillPoints > 0) {
    const r = await page.evaluate(() => window.__UAIDZIN__.learnRandomSkill());
    log("learn", JSON.stringify(r));
  }
  if (before.unspentPoints > 0 || (await snap()).unspentPoints > 0) {
    const r = await page.evaluate(() => window.__UAIDZIN__.spendRandomAttributes());
    log("attrs", JSON.stringify(r));
  }
}

async function farmUntilExit(maxMs = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const st = await snap();
    if (st.mode === "RESULT" || st.mode === "CITY" || st.mode === "DEAD") return st;
    if (st.mode === "DUNGEON") {
      const target = await page.evaluate(() => {
        const list = window.__UAIDZIN__.getAliveEnemies() || [];
        if (!list.length) return null;
        const e = list[Math.floor(Math.random() * list.length)];
        return { x: e.x, z: e.z + 0.6 };
      });
      if (target) {
        await page.evaluate(({ x, z }) => window.__UAIDZIN__.teleportPlayer(x, z), target);
      }
      await page.waitForTimeout(700);
      await spendAndLearn();
    } else {
      await page.waitForTimeout(200);
    }
  }
  return snap();
}

// primeira dungeon do loop
await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
await page.waitForTimeout(300);

while (elapsedMin() < TIMEOUT_MIN) {
  s = await snap();
  if (s.level >= MAX_LEVEL) {
    log("ALVO ATINGIDO nível", s.level);
    break;
  }

  if (s.mode === "CITY") {
    await spendAndLearn();
    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    await page.waitForTimeout(250);
    s = await snap();
  }

  if (s.mode === "DUNGEON" || s.mode === "DEAD") {
    runs += 1;
    s = await farmUntilExit(Math.max(30000, 90000 * (SPEED >= 10 ? 1 : 10)));
    log("run", runs, "→", s.mode, "lv", s.level, "kills", s.kills, "slots", s.skillSlots);
    if (s.mode === "RESULT") {
      await page.waitForTimeout(2800);
      await page.evaluate(() => window.__UAIDZIN__.toCity());
      await page.waitForTimeout(200);
    }
    if (s.mode === "DEAD") {
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__UAIDZIN__.toCity());
      await page.waitForTimeout(200);
    }
    await spendAndLearn();
    continue;
  }

  if (s.mode === "RESULT") {
    await page.waitForTimeout(2800);
    await page.evaluate(() => window.__UAIDZIN__.toCity());
    await page.waitForTimeout(200);
    continue;
  }

  await page.waitForTimeout(200);
}

s = await snap();
await page.evaluate(() => window.__UAIDZIN__.persistSave());
await page.waitForTimeout(300);

const summary = {
  level: s.level,
  classId: s.classId,
  skillSlots: s.skillSlots,
  skillPoints: s.skillPoints,
  unspentPoints: s.unspentPoints,
  killsLastRun: s.kills,
  runs,
  interactionsOpened,
  timeScale: s.timeScale,
  elapsedMin: Number(elapsedMin().toFixed(1)),
  pageErrors,
  reachedMax: s.level >= MAX_LEVEL,
};

log("FIM", JSON.stringify(summary));
await browser.close();

if (pageErrors > 0) {
  console.error("Bot terminou com pageerrors:", pageErrors);
  process.exit(1);
}
if (s.level < Math.min(MAX_LEVEL, 5)) {
  console.error("Bot não progrediu o suficiente:", summary);
  process.exit(1);
}
process.exit(0);
