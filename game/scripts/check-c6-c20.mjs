import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed += 1;
  console.error("FAIL", m);
};

const MOCK_RE =
  /no futuro|por ora|protótipo|prototipo|placeholder|lorem|mockup|fica a cargo do Sábio quando|estoque vem da configuração/i;
const NEED_ACCENT = /\b(sabio|progressao|tecnica|tecnicas|evolucao|sobrevivencia|composicao)\b/i;

function visibleSageBlob(src) {
  const titles = [...src.matchAll(/title:\s*"([^"]+)"/g)].map((m) => m[1]);
  const htmls = [...src.matchAll(/html:\s*((?:"[^"]*"\s*\+\s*)*"[^"]*")/g)].map((m) =>
    m[1].replace(/"\s*\+\s*"/g, "").replace(/^"|"$/g, ""),
  );
  const labels = [...src.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  return [...labels, ...titles, ...htmls].join("\n");
}

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
const page = await browser.newPage();

await wipe(page);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(600);
let frame = page.frameLocator("iframe").first();
await loginAdmin(page, frame);

await frame.locator("#btnCreateFirst").click();
await frame.locator("#newName").fill("SabioCheck");
await frame.locator("#btnCreateConfirm").click();
await page.waitForTimeout(900);
await frame.locator("#btnConnect").click();
await page.waitForFunction(
  () => window.__UAIDZIN__?.session?.character?.name === "SabioCheck",
  null,
  { timeout: 30000 },
);
await page.waitForTimeout(1200);

const c6 = await page.evaluate(async () => {
  const api = window.__UAIDZIN__;
  const s = api.session;
  api.closePanels();
  api.openPanel("inv");
  await new Promise((r) => setTimeout(r, 50));
  const invBefore = !!document.querySelector("#wire-ui #p-inv:not(.is-closed)");
  const sageNpc = s.worlds.getCurrent().interactables.find((i) => i.id === "npc-sage");
  if (!sageNpc) return { error: "no-sage" };
  api.teleportPlayer(sageNpc.x, sageNpc.z);
  api.queueInteractById("npc-sage");
  for (let i = 0; i < 30; i++) s.update(1 / 60, 16 / 9, false);
  await new Promise((r) => setTimeout(r, 150));
  const wire = document.querySelector("#wire-ui");
  return {
    invBefore,
    sageOpen: !!wire?.querySelector("#p-sage:not(.is-closed)"),
    invOpen: !!wire?.querySelector("#p-inv:not(.is-closed)"),
    personOpen: !!wire?.querySelector("#p-person:not(.is-closed)"),
    skillmasterOpen: !!wire?.querySelector("#p-skillmaster:not(.is-closed)"),
  };
});
console.log("C6", JSON.stringify(c6));
if (c6.error) fail("C6: " + c6.error);
else if (c6.invBefore && c6.sageOpen && !c6.invOpen && !c6.personOpen && !c6.skillmasterOpen) {
  ok("C6: Sábio abre sozinho (sem equipamento/personagem)");
} else {
  fail("C6: " + JSON.stringify(c6));
}

const c20 = await page.evaluate(() => {
  const api = window.__UAIDZIN__;
  api.openPanel("sage");
  const text = document.querySelector("#wire-ui #sageText")?.innerText || "";
  const index = document.querySelector("#wire-ui #sageIndex")?.innerText || "";
  const tabs = document.querySelector("#wire-ui #sageTabs")?.innerText || "";
  const all = `${tabs}\n${index}\n${text}`;
  const titles = [...document.querySelectorAll("#wire-ui #sageIndex button")].map((b) => b.textContent || "");
  return { all, titles, hasProgressao: /Progressão/.test(tabs), hasSabio: /Sábio|códice|códex/i.test(all) };
});

const mockHit = c20.all.match(MOCK_RE);
const accentHit = c20.all.match(NEED_ACCENT);
console.log("C20 titles", JSON.stringify(c20.titles));
if (mockHit) fail("C20: mockup residual: " + mockHit[0]);
else ok("C20: sem lixo de mockup no texto pintado");
if (accentHit) fail("C20: falta acento em: " + accentHit[0]);
else ok("C20: termos comuns com acento");
if (c20.hasProgressao && c20.titles.length >= 8) ok("C20: abas e índice do Sábio montados");
else fail("C20: índice incompleto " + JSON.stringify(c20));

const sageSrc = fs.readFileSync(new URL("../src/ui/wire/sage.ts", import.meta.url), "utf8");
const docsSlice = sageSrc.slice(sageSrc.indexOf("SAGE_DOCS"), sageSrc.indexOf("export function createSagePanel"));
const visible = visibleSageBlob(docsSlice);
const srcMock = visible.match(MOCK_RE);
const srcAccent = visible.match(NEED_ACCENT);
if (srcMock) fail("C20 fonte: mockup " + srcMock[0]);
else ok("C20 fonte SAGE_DOCS limpa de mockup");
if (srcAccent) fail("C20 fonte: acento " + srcAccent[0]);
else ok("C20 fonte SAGE_DOCS com acentos");
if (!/tutorial e códice/.test(visible)) fail("C20 fonte: linha do Sábio não revisada");
else ok("C20 fonte: papel do Sábio revisado");

await browser.close();
process.exit(failed ? 1 : 0);
