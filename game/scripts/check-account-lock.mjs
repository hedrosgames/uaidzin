import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
const REFUSAL = "Esta conta já está aberta em outra aba.";
const LOCK_TTL_MS = 5000;
let failed = 0;
const ok = (m) => console.log("LOCK_OK", m);
const fail = (m) => {
  failed += 1;
  console.error("LOCK_FAIL", m);
};

async function openLogin(page) {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  const frame = page.frameLocator("iframe").first();
  await frame.locator("#user").waitFor({ timeout: 30000 });
  return frame;
}

async function submitLogin(frame, user, pass) {
  await frame.locator("#user").fill(user);
  await frame.locator("#pass").fill(pass);
  await frame.locator("#btnLogin").click();
}

function inSelection(page, timeout = 20000) {
  return page
    .waitForFunction(() => /02-selecao/.test(document.querySelector("iframe")?.contentWindow?.location?.href || ""), null, { timeout })
    .then(() => true)
    .catch(() => false);
}

async function refusalShown(page) {
  const frame = page.frameLocator("iframe").first();
  try {
    await frame.locator("#msgError.show").waitFor({ timeout: 15000 });
    return (await frame.locator("#msgErrorText").textContent())?.trim() === REFUSAL;
  } catch {
    return false;
  }
}

async function frameState(page) {
  return page
    .evaluate(() => {
      const w = document.querySelector("iframe")?.contentWindow;
      const d = w?.document;
      return {
        href: w?.location?.href || "",
        error: d?.querySelector("#msgError.show #msgErrorText")?.textContent || "",
        success: d?.querySelector("#msgSuccess.show #msgSuccessText")?.textContent || "",
        button: d?.querySelector("#btnLogin")?.textContent || "",
      };
    })
    .catch((err) => ({ err: String(err) }));
}

async function entered(page) {
  return page.evaluate(() => !!window.__UAIDZIN__?.getSnapshot?.()?.entered).catch(() => false);
}

async function enterGame(page) {
  const frame = page.frameLocator("iframe").first();
  await frame.locator("#slotList .slot-card").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(600);
  const hasChar = await frame.locator(".char").count();
  if (!hasChar) {
    await frame.locator("#btnCreateFirst").click();
    await frame.locator("#newName").fill("Trava");
    await frame.locator("#btnCreateConfirm").click();
    await page.waitForTimeout(800);
  } else {
    await frame.locator(".char").first().click();
  }
  await frame.locator("#btnConnect").click();
  await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.()?.entered, null, { timeout: 60000 });
}

function countStorageWrites() {
  const host = window.top;
  if (host === window) host.__lockWrites = 0;
  for (const name of ["put", "add", "delete", "clear"]) {
    const orig = IDBObjectStore.prototype[name];
    IDBObjectStore.prototype[name] = function (...args) {
      host.__lockWrites = (host.__lockWrites || 0) + 1;
      return orig.apply(this, args);
    };
  }
}

async function runScenarios(context, label) {
  const first = await context.newPage();
  await submitLogin(await openLogin(first), "admin", "admin");
  if (await inSelection(first)) ok(`${label}: primeira aba logou`);
  else fail(`${label}: primeira aba não chegou na seleção`);
  await enterGame(first);
  ok(`${label}: primeira aba entrou no jogo`);

  const second = await context.newPage();
  await submitLogin(await openLogin(second), "admin", "admin");
  const refused = await refusalShown(second);
  const secondSession = await second.evaluate(() => sessionStorage.getItem("uaidzin_session_v1"));
  if (refused && !(await entered(second)) && !secondSession) ok(`${label}: segunda aba recusada com a mensagem`);
  else fail(`${label}: segunda aba ${JSON.stringify({ refused, session: !!secondSession })}`);

  const copied = await first.evaluate(() => ({
    session: sessionStorage.getItem("uaidzin_session_v1"),
    active: sessionStorage.getItem("uaidzin_active_char"),
  }));
  const dup = await context.newPage();
  await dup.addInitScript(countStorageWrites);
  await dup.addInitScript((data) => {
    if (window.top !== window || sessionStorage.getItem("lock_dup_seeded")) return;
    sessionStorage.setItem("lock_dup_seeded", "1");
    sessionStorage.setItem("uaidzin_session_v1", data.session);
    sessionStorage.setItem("uaidzin_active_char", data.active);
  }, copied);
  await dup.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  const dupRefused = await refusalShown(dup);
  const dupState = await dup.evaluate(() => ({
    writes: window.__lockWrites,
    session: sessionStorage.getItem("uaidzin_session_v1"),
    active: sessionStorage.getItem("uaidzin_active_char"),
  }));
  if (dupRefused && !(await entered(dup)) && dupState.writes === 0 && !dupState.session && !dupState.active) {
    ok(`${label}: aba duplicada (sessionStorage copiado) recusada sem gravar`);
  } else {
    fail(`${label}: aba duplicada ${JSON.stringify({ dupRefused, ...dupState })}`);
  }
  await dup.close();

  const other = await context.newPage();
  const otherFrame = await openLogin(other);
  const otherUser = "Outra" + label.replace(/\W/g, "");
  await otherFrame.locator("#btnCreateAccount").click();
  await submitLogin(otherFrame, otherUser, "senha123");
  if (await inSelection(other)) ok(`${label}: conta diferente em outra aba entra`);
  else fail(`${label}: conta diferente não entrou: ${JSON.stringify(await frameState(other))}`);
  await other.close();

  await first.close();
  if (label === "fallback") await second.waitForTimeout(LOCK_TTL_MS + 500);
  const again = await openLogin(second);
  await submitLogin(again, "admin", "admin");
  if (await inSelection(second)) ok(`${label}: após fechar a primeira, segunda loga`);
  else fail(`${label}: segunda aba não logou após fechar a primeira`);
  await enterGame(second);
  ok(`${label}: segunda aba entrou no jogo`);
  await second.close();
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const wipe = await context.newPage();
  await wipe.goto(BASE + "/tools/save-wipe.html?auto=all", { waitUntil: "domcontentloaded", timeout: 30000 });
  await wipe.waitForTimeout(800);
  await wipe.close();
  const forged = await context.newPage();
  await openLogin(forged);
  await forged.evaluate(() => {
    const character = { id: "admin:slot:0", name: "Forjado", classId: "TK", level: 99, evolution: "Mortal" };
    window.postMessage({ type: "uaidzin-boot-enter", character }, "*");
    window.postMessage({ type: "uaidzin-boot-login-ok", session: { user: "admin", key: 1 } }, "*");
  });
  await forged.waitForTimeout(1500);
  const forgedState = await forged.evaluate(() => ({
    active: sessionStorage.getItem("uaidzin_active_char"),
    frame: !!document.querySelector("iframe"),
    href: document.querySelector("iframe")?.contentWindow?.location?.href || "",
  }));
  if (!forgedState.active && forgedState.frame && /01-login/.test(forgedState.href) && !(await entered(forged))) {
    ok("postMessage fora do contrato não altera personagem nem sessão");
  } else {
    fail("postMessage forjado: " + JSON.stringify(forgedState));
  }
  await forged.close();
  await runScenarios(context, "navigator.locks");
  await context.close();

  const fallback = await browser.newContext();
  await fallback.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "locks", { get: () => undefined, configurable: true });
  });
  await runScenarios(fallback, "fallback");
  await fallback.close();
} finally {
  await browser.close();
}

if (failed) {
  console.error("LOCK_FAILED", failed);
  process.exit(1);
}
console.log("LOCK_PASSED");
