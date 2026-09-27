import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed += 1;
  console.error("FAIL", m);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/tools/save-wipe.html?auto=all`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(600);

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
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
  await frame.locator("#newName").fill("TransTest");
  await frame.locator("#btnCreateConfirm").click();
  await page.waitForTimeout(900);
  await frame.locator("#btnConnect").click();

  await page.waitForFunction(
    () => window.__UAIDZIN__?.session?.character?.name === "TransTest",
    null,
    { timeout: 30000 },
  );

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.mode === "CITY",
    null,
    { timeout: 30000 },
  );
  ok("Sessao iniciada na cidade");

  const doubleClickResult = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const r1 = s.tryEnterDungeon("dungeon-1");
    const r2 = s.tryEnterDungeon("dungeon-1");
    return { r1, r2, busy: s.worldFadeBusy };
  });

  if (doubleClickResult.r1.ok && !doubleClickResult.r2.ok && doubleClickResult.r2.reason === "busy") {
    ok("Cenario A: clique duplo no portal bloqueia a segunda chamada com busy");
  } else {
    fail("Cenario A falhou: " + JSON.stringify(doubleClickResult));
  }

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.mode === "DUNGEON",
    null,
    { timeout: 20000 },
  );
  ok("Entrada na dungeon concluida apos cenario A");

  await page.evaluate(() => {
    window.__UAIDZIN__.session.returnToCityWithFade();
  });

  const enterDuringFade = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const res = s.tryEnterDungeon("dungeon-1");
    return { res, busy: s.worldFadeBusy };
  });

  if (!enterDuringFade.res.ok && enterDuringFade.res.reason === "busy") {
    ok("Cenario B: entrada durante fade devolve busy sem consumir item");
  } else {
    fail("Cenario B falhou: " + JSON.stringify(enterDuringFade));
  }

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.mode === "CITY" && !window.__UAIDZIN__.session.worldFadeBusy,
    null,
    { timeout: 20000 },
  );
  ok("Retorno a cidade concluido apos cenario B");

  const deathDuringFade = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const enterRes = s.tryEnterDungeon("dungeon-1");
    s.dungeonFlow.finishDungeon("death");
    return { enterRes, pending: s.dungeonFlow.pendingLeaveReason };
  });

  if (deathDuringFade.enterRes.ok && deathDuringFade.pending === "death") {
    ok("Cenario C: morte agendada durante fade com pendingLeaveReason");
  } else {
    fail("Cenario C inicio falhou: " + JSON.stringify(deathDuringFade));
  }

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.mode === "CITY" && !window.__UAIDZIN__.session.worldFadeBusy,
    null,
    { timeout: 25000 },
  );

  const finalMode = await page.evaluate(() => {
    return {
      mode: window.__UAIDZIN__.getSnapshot().mode,
      dead: window.__UAIDZIN__.session.character.isDead,
      world: window.__UAIDZIN__.session.worlds.getCurrent().id,
    };
  });

  if (finalMode.mode === "CITY" && !finalMode.dead && finalMode.world === "city") {
    ok("Cenario C concluido: jogador retornado a cidade vivo e sem travar");
  } else {
    fail("Cenario C estado final incorreto: " + JSON.stringify(finalMode));
  }

} catch (err) {
  fail("Excecao nao tratada: " + (err?.stack || err?.message || String(err)));
} finally {
  await browser.close();
  if (failed > 0) {
    console.error(`TOTAL DE FALHAS: ${failed}`);
    process.exit(1);
  } else {
    console.log("TODOS OS CENARIOS DE TRANSICAO PASSARAM COM SUCESSO");
    process.exit(0);
  }
}
