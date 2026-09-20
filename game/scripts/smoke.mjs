/**
 * Smoke test do UAIDZIN — sobe o preview sozinho, roda um ciclo cidade→dungeon→combate→save→cidade.
 * Uso: npm run smoke
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5174;
const BASE = `http://127.0.0.1:${PORT}/`;
const GLOBAL_TIMEOUT_MS = 3 * 60 * 1000;

let failed = 0;
let pageErrors = 0;
let server = null;

function ok(msg) {
  console.log("SMOKE_OK", msg);
}
function fail(msg) {
  failed += 1;
  console.error("SMOKE_FAIL", msg);
}

function killServer() {
  if (!server || server.killed) return;
  if (process.platform === "win32" && server.pid) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGTERM");
  }
  server = null;
}

const globalTimer = setTimeout(() => {
  console.error("SMOKE_FAIL timeout global de 3min estourado");
  killServer();
  process.exit(1);
}, GLOBAL_TIMEOUT_MS);
globalTimer.unref();

function run(command) {
  const res = spawnSync(command, { cwd: ROOT, stdio: "inherit", shell: true });
  if (res.status !== 0) throw new Error(`${command} falhou (status ${res.status})`);
}

async function waitForServer(timeoutMs = 30000) {
  const t0 = Date.now();
  let lastErr = "sem resposta";
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: "GET" });
      if (res.ok) return;
      lastErr = `HTTP ${res.status}`;
    } catch (err) {
      lastErr = err.message;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`preview não respondeu em ${timeoutMs}ms na porta ${PORT}: ${lastErr}`);
}

function startServer() {
  server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
  });
  server.on("error", (err) => {
    console.error("SMOKE_FAIL preview não iniciou:", err.message);
  });
}

async function main() {
  // Sempre reconstrói: servir um dist/ velho faria o smoke testar código que não é o
  // do working tree, e ele passaria verde sobre uma regressão já introduzida.
  console.log("vite build");
  run("npx vite build");

  startServer();
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", (err) => {
      pageErrors += 1;
      console.error("SMOKE_PAGEERROR", err.message);
    });

    const snap = () => page.evaluate(() => window.__UAIDZIN__.getSnapshot());
    const waitApi = async () => {
      await page.waitForFunction(() => !!window.__UAIDZIN__, null, { timeout: 30000 });
      await page.waitForFunction(() => !!window.__UAIDZIN__.getSnapshot().entered, null, {
        timeout: 30000,
      });
    };
    async function waitSnap(pred, timeoutMs, label) {
      const t0 = Date.now();
      let last = null;
      while (Date.now() - t0 < timeoutMs) {
        last = await snap();
        if (pred(last)) return last;
        await page.waitForTimeout(100);
      }
      throw new Error(`timeout esperando ${label}; último snapshot mode=${last?.mode}`);
    }

    await page.addInitScript(() => {
      window.__UAIDZIN_SKIP_BOOT__ = {
        id: "smoke:slot:0",
        name: "Smoke",
        classId: "TK",
        level: 1,
        evolution: "Mortal",
        gold: 500,
        attrs: { FOR: 12, DES: 12, CONS: 12, INT: 12 },
      };
    });

    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitApi();
    await page.evaluate(async () => {
      await window.__UAIDZIN__.clearSave();
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitApi();
    await page.waitForTimeout(500);

    // 1. BOOT
    let s = await snap();
    if (s.mode === "CITY") ok("boot mode=CITY");
    else fail(`boot mode esperado "CITY", recebido "${s.mode}"`);
    if (s.classId === "TK") ok("boot classId=TK");
    else fail(`boot classId esperado "TK", recebido "${s.classId}"`);
    if (s.level === 1) ok("boot level=1");
    else fail(`boot level esperado 1, recebido ${s.level}`);

    // 2. DUNGEON
    await page.evaluate(() => window.__UAIDZIN__.enterDungeon());
    try {
      s = await waitSnap((x) => x.mode === "DUNGEON", 8000, 'mode "DUNGEON"');
      ok("entrou na dungeon");
    } catch (err) {
      fail(`dungeon: esperado mode "DUNGEON" em até 8s, ${err.message}`);
      s = await snap();
    }
    if (s.enemiesAlive > 0) ok(`inimigos vivos=${s.enemiesAlive}`);
    else fail(`dungeon enemiesAlive esperado > 0, recebido ${s.enemiesAlive}`);

    // 3. COMBATE
    await page.evaluate(() => window.__UAIDZIN__.setTimeScale(10));
    let maxFx = 0;
    let maxKills = 0;
    const combatStart = Date.now();
    while (Date.now() - combatStart < 60000) {
      const cur = await snap();
      maxFx = Math.max(maxFx, cur.fxCount);
      maxKills = Math.max(maxKills, cur.kills);
      if (maxKills > 0) break;
      if (cur.mode !== "DUNGEON") break;
      const target = await page.evaluate(() => {
        const list = window.__UAIDZIN__.getAliveEnemies() || [];
        if (!list.length) return null;
        const e = list[0];
        return { x: e.x, z: e.z + 0.6 };
      });
      if (target) {
        await page.evaluate(({ x, z }) => window.__UAIDZIN__.teleportPlayer(x, z), target);
      }
      await page.waitForTimeout(700);
      const after = await snap();
      maxFx = Math.max(maxFx, after.fxCount);
      maxKills = Math.max(maxKills, after.kills);
    }
    if (maxKills > 0) ok(`kills=${maxKills}`);
    else fail(`combate kills esperado > 0, recebido ${maxKills} após 60s`);
    if (maxFx > 0) ok(`fxCount máximo observado=${maxFx}`);
    else fail(`combate fxCount máximo esperado > 0, recebido ${maxFx}`);

    // 4. CIDADE LIMPA
    await page.evaluate(() => window.__UAIDZIN__.setTimeScale(1));
    await page.evaluate(() => window.__UAIDZIN__.toCity());
    await page.waitForTimeout(600);
    s = await snap();
    if (s.mode === "CITY") ok("volta para cidade mode=CITY");
    else fail(`cidade mode esperado "CITY", recebido "${s.mode}"`);
    if (s.enemiesAlive === 0) ok("cidade sem inimigos");
    else fail(`cidade enemiesAlive esperado 0, recebido ${s.enemiesAlive}`);
    if (s.timerPhase === "idle") ok('cidade timerPhase="idle"');
    else fail(`cidade timerPhase esperado "idle", recebido "${s.timerPhase}"`);

    // fxCount é contador acumulado de VFX (EffectManager.count só incrementa),
    // não contagem de efeitos vivos. Parado na cidade ele não pode crescer.
    const fxIdleStart = s.fxCount;
    await page.waitForTimeout(1500);
    const fxIdleEnd = (await snap()).fxCount;
    if (fxIdleEnd === fxIdleStart) ok(`cidade sem VFX novo parado (fxCount estável em ${fxIdleEnd})`);
    else fail(`cidade gerou VFX parada: fxCount ${fxIdleStart} → ${fxIdleEnd}`);

    // 4b. EQUIPAMENTO — bônus tem de sobreviver a recomputeCombatStats().
    // Regressão: base e equipamento já escreveram o mesmo campo, então subir de
    // nível apagava o bônus e desequipar deixava o atributo abaixo do base.
    const equipResult = await page.evaluate(() => {
      const s = window.__UAIDZIN__.session;
      const base = { attack: s.character.attack, defense: s.character.defense };
      const item = {
        uid: "smoke_weapon_1",
        defId: "smoke_sword",
        name: "Espada de Teste",
        rarity: "comum",
        slot: "weapon",
        refine: 0,
        attackBonus: 10,
        defenseBonus: 3,
        stack: 1,
        sellValue: 1,
      };
      if (!s.inventory.add(item)) return { error: "inventário cheio" };
      if (!s.equipment.equip(item.uid)) return { error: "equip falhou" };
      const equipped = { attack: s.character.attack, defense: s.character.defense };
      s.progression.recomputeCombatStats();
      const afterRecompute = { attack: s.character.attack, defense: s.character.defense };
      s.equipment.unequip("weapon");
      const afterUnequip = { attack: s.character.attack, defense: s.character.defense };
      return { base, equipped, afterRecompute, afterUnequip };
    });

    if (equipResult.error) {
      fail(`equipamento: ${equipResult.error}`);
    } else {
      const { base, equipped, afterRecompute, afterUnequip } = equipResult;
      if (equipped.attack === base.attack + 10) ok(`equipar somou ataque (${base.attack} → ${equipped.attack})`);
      else fail(`equipar: ataque esperado ${base.attack + 10}, recebido ${equipped.attack}`);

      if (afterRecompute.attack === base.attack + 10) ok("bônus sobrevive a recomputeCombatStats");
      else fail(`recompute apagou o bônus: ataque esperado ${base.attack + 10}, recebido ${afterRecompute.attack}`);

      if (afterRecompute.defense === base.defense + 3) ok("bônus de defesa sobrevive a recomputeCombatStats");
      else fail(`recompute apagou a defesa: esperado ${base.defense + 3}, recebido ${afterRecompute.defense}`);

      if (afterUnequip.attack === base.attack) ok(`desequipar volta ao base (${afterUnequip.attack})`);
      else fail(`desequipar: ataque esperado ${base.attack}, recebido ${afterUnequip.attack}`);

      if (afterUnequip.defense === base.defense) ok(`desequipar volta defesa ao base (${afterUnequip.defense})`);
      else fail(`desequipar: defesa esperada ${base.defense}, recebida ${afterUnequip.defense}`);
    }

    // 5. SAVE — round-trip exato a partir do estado estável da cidade.
    // Feito na cidade (sem combate correndo) para que o valor não mude sob o teste.
    const before = await snap();
    if (before.gold > 0) ok(`estado pré-save não trivial (gold=${before.gold})`);
    else fail(`pré-save esperava gold > 0 para o round-trip valer algo, recebido ${before.gold}`);

    await page.evaluate(async () => {
      await window.__UAIDZIN__.persistSave();
    });
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitApi();
    await page.waitForTimeout(800);
    s = await snap();
    if (s.level === before.level) ok(`save round-trip level=${s.level}`);
    else fail(`save level esperado exatamente ${before.level}, recebido ${s.level}`);
    if (s.gold === before.gold) ok(`save round-trip gold=${s.gold}`);
    else fail(`save gold esperado exatamente ${before.gold}, recebido ${s.gold}`);
    if (s.invUsed === before.invUsed) ok(`save round-trip invUsed=${s.invUsed}`);
    else fail(`save invUsed esperado ${before.invUsed}, recebido ${s.invUsed}`);
  } finally {
    await browser.close();
    killServer();
    clearTimeout(globalTimer);
  }

  if (pageErrors > 0) fail(`${pageErrors} pageerror(s) no console da página`);

  if (failed) {
    console.error("SMOKE_FAILED", failed);
    process.exit(1);
  }
  console.log("SMOKE_PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err.stack || err.message);
  killServer();
  process.exit(1);
});
