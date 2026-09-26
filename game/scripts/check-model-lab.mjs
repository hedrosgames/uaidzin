import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
const MOUNTS_FILE = path.join(ROOT, "game/src/data/weapons/weapon-mounts.json");
const ENDPOINT = "**/api/dev/weapon-mounts";
let failed = 0;
const ok = (message) => console.log("OK", message);
const fail = (message) => {
  failed += 1;
  console.error("FAIL", message);
};

function check(condition, label, detail = "") {
  if (condition) ok(label);
  else fail(`${label}${detail ? ` — ${detail}` : ""}`);
}

function readMounts() {
  if (!fs.existsSync(MOUNTS_FILE)) return null;
  return JSON.parse(fs.readFileSync(MOUNTS_FILE, "utf8"));
}

function mountOf(classId, setId, side) {
  const payload = readMounts();
  return (payload?.mounts ?? []).find(
    (entry) => entry.class === classId && entry.set === setId && entry.side === side,
  );
}

async function pieceOffset(page, pieceName) {
  return page.evaluate((name) => {
    const scene = window.__THREE_SCENE__;
    if (!scene) return null;
    let piece = null;
    scene.traverse((obj) => {
      if (!piece && obj.name === name) piece = obj;
    });
    if (!piece) return null;
    const group = piece.children.find((child) => child.name === "mount-adjust");
    if (!group) return null;
    return { position: group.position.toArray(), rotation: group.rotation.toArray().slice(0, 3) };
  }, pieceName);
}

async function pieceScreenPosition(page, pieceName) {
  return page.evaluate((name) => {
    const scene = window.__THREE_SCENE__;
    const camera = window.__THREE_CAMERA__;
    if (!scene || !camera) return null;
    let piece = null;
    scene.traverse((obj) => {
      if (!piece && obj.name === name) piece = obj;
    });
    if (!piece) return null;
    piece.updateWorldMatrix(true, true);
    const box = new window.THREE.Box3().setFromObject(piece);
    const center = new window.THREE.Vector3();
    box.getCenter(center);
    const projected = center.clone().project(camera);
    const canvas = document.querySelector(".card-character .card-stage canvas");
    return {
      x: ((projected.x + 1) / 2) * canvas.clientWidth,
      y: ((1 - projected.y) / 2) * canvas.clientHeight,
    };
  }, pieceName);
}

async function run() {
  const previous = fs.existsSync(MOUNTS_FILE) ? fs.readFileSync(MOUNTS_FILE, "utf8") : null;
  fs.rmSync(MOUNTS_FILE, { force: true });

  const browser = await chromium.launch({ headless: true });
  try {
    await runChecks(browser);
  } finally {
    if (previous === null) fs.rmSync(MOUNTS_FILE, { force: true });
    else fs.writeFileSync(MOUNTS_FILE, previous);
    await browser.close();
  }

  if (failed) {
    console.error(`\n${failed} check(s) falharam`);
    process.exit(1);
  }
  console.log("\nmodel lab ok");
}

async function runChecks(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${BASE}/model-lab.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__MODEL_LAB__?.state().ready === true, null, { timeout: 90000 });

  const state = await page.evaluate(() => window.__MODEL_LAB__.state());
  check(state.characters.length === 4, "4 cards de personagem");
  check(state.monsters.length === 5, "5 cards de monstro");
  check(state.characters.every((card) => card.clip === "idle"), "personagens começam em idle");
  check(state.characters.every((card) => card.pieces.length >= 1), "peças de arma montadas");
  check(state.monsters.every((card) => card.clips.length === 6), "monstros com 6 clipes de mutant");
  check(
    (await page.locator(".card-character .card-stage canvas").count()) === 4,
    "4 janelas 3D de personagem",
  );

  const tkCanvas = page.locator('.card-character[data-class="TK"] .card-stage canvas');
  const firstFrame = await tkCanvas.screenshot();
  await page.waitForTimeout(700);
  check(!firstFrame.equals(await tkCanvas.screenshot()), "animação rodando no card");

  const weaponOptions = await page.locator("#weapon-all option").evaluateAll((nodes) =>
    nodes.map((node) => node.value),
  );
  check(weaponOptions.length === 9, "9 conjuntos de arma na toolbar", String(weaponOptions.length));
  let weaponOk = true;
  for (const set of weaponOptions) {
    await page.selectOption("#weapon-all", set);
    await page.waitForFunction(
      (expected) => window.__MODEL_LAB__.state().characters.every((card) => card.weaponSet === expected),
      set,
      { timeout: 15000 },
    );
    const pieces = await page.locator('.card-character[data-class="TK"] .piece-select option').count();
    const label = ((await page.locator('.card-character[data-class="TK"] .weapon-label').textContent()) ?? "").trim();
    if (pieces < 1 || label.length === 0) {
      weaponOk = false;
      fail(`conjunto ${set} sem peça montada`);
    }
  }
  check(weaponOk, "troca de arma monta peças nos 9 conjuntos");

  const clipOptions = await page.locator("#anim-all option").evaluateAll((nodes) =>
    nodes.map((node) => node.value),
  );
  check(clipOptions.length === 19, "19 animações na toolbar", String(clipOptions.length));
  const clipFailures = [];
  for (const clip of clipOptions) {
    await page.selectOption("#anim-all", clip);
    await page.waitForFunction(
      (expected) => window.__MODEL_LAB__.state().characters.every((card) => card.clip === expected),
      clip,
      { timeout: 15000 },
    );
  }
  const afterAllClips = await page.evaluate(() => window.__MODEL_LAB__.state());
  for (const card of afterAllClips.characters) {
    if (card.clip !== clipOptions[clipOptions.length - 1]) clipFailures.push(`${card.id}=${card.clip}`);
  }
  check(clipFailures.length === 0, "troca de animação aplicada aos 4 em todas as 19", clipFailures.join(","));
  check(
    consoleErrors.length === 0,
    "trocar as 19 animações sem erro de console",
    consoleErrors.slice(0, 2).join(" | "),
  );

  await page.evaluate(() => {
    const select = document.querySelector("#anim-all");
    for (const id of ["attack_greatsword", "cast_heal", "death"]) {
      select.value = id;
      select.dispatchEvent(new Event("change"));
    }
  });
  await page.waitForTimeout(3000);
  const raced = await page.evaluate(() => window.__MODEL_LAB__.state());
  check(
    (await page.locator("#anim-all").inputValue()) === "death" &&
      raced.characters.every((card) => card.clip === "death"),
    "troca rápida de animação: última escolha vence",
    JSON.stringify(raced.characters.map((card) => card.clip)),
  );

  const setBefore = await page.evaluate(() => window.__MODEL_LAB__.state().characters[0].weaponSet);
  await page.locator('.card-character[data-class="TK"] .next-weapon').click();
  await page.locator('.card-character[data-class="TK"] .next-weapon').click();
  await page.waitForTimeout(2500);
  const cycled = await page.evaluate(() => window.__MODEL_LAB__.state());
  const order = ["dual-axe", "axe-shield", "sword-shield", "dual-sword", "greatsword", "dual-gloves", "staff-shield", "greatstaff", "bow"];
  const expected = order[(order.indexOf(setBefore) + 2) % order.length];
  check(
    new Set(cycled.characters.map((card) => card.weaponSet)).size === 1 &&
      cycled.characters[0].weaponSet === expected &&
      (await page.locator("#weapon-all").inputValue()) === expected,
    "dois cliques rápidos em próxima arma param no conjunto certo",
    `${setBefore} -> ${cycled.characters[0].weaponSet} (esperado ${expected})`,
  );
  check(
    cycled.characters.every((card) => card.pieces.length >= 1),
    "peças remontadas depois da troca rápida",
  );

  await page.selectOption("#anim-all", "idle");
  await page.selectOption("#weapon-all", "axe-shield");
  await page.waitForTimeout(1500);

  const tkCard = page.locator('.card-character[data-class="TK"]');
  await tkCard.locator(".toggle-adjust").click();
  await page.waitForTimeout(900);
  check(await tkCard.locator(".adjust").isVisible(), "painel de ajuste abre");
  check((await page.locator(".card-character .adjust:visible").count()) === 1, "só o card clicado entra em ajuste");
  check(await tkCard.locator(".pause-toggle").isChecked(), "ajuste pausa a animação");

  await page.selectOption("#anim-all", "attack_1h");
  await page.waitForTimeout(700);
  check(await tkCard.locator(".pause-toggle").isChecked(), "trocar animação durante o ajuste não despausa");
  await page.selectOption("#anim-all", "idle");
  await page.waitForTimeout(500);

  await tkCard.locator(".pos-y").fill("0.1");
  await tkCard.locator(".pos-y").dispatchEvent("input");
  await tkCard.locator(".rot-x").fill("30");
  await tkCard.locator(".rot-x").dispatchEvent("input");
  const before = await pieceScreenPosition(page, "weapon-right-axe");
  const canvasBox = await tkCard.locator(".card-stage canvas").boundingBox();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 60, canvasBox.y + canvasBox.height / 2 - 30, {
    steps: 10,
  });
  await page.waitForTimeout(120);
  const after = await pieceScreenPosition(page, "weapon-right-axe");
  await page.mouse.up();
  await page.waitForTimeout(300);
  check(!!before && !!after, "peça da arma visível na cena");
  check(
    !!before && !!after && after.x - before.x > 40 && after.y - before.y < -20,
    "arraste acompanha o cursor",
    before && after ? `dx=${Math.round(after.x - before.x)} dy=${Math.round(after.y - before.y)}` : "",
  );

  await tkCard.locator(".save-mount").click();
  await page.waitForTimeout(900);
  const note = (await tkCard.locator(".adjust-note").textContent()) ?? "";
  check(note.includes("weapon-mounts.json"), "aviso de gravação no arquivo", note);
  check(await tkCard.locator(".card-flag").isVisible(), "selo de ajustado");
  const tkEntry = mountOf("TK", "axe-shield", "right");
  check(!!tkEntry, "entrada TK/axe-shield/right gravada");
  check(!!tkEntry && tkEntry.rotation[0] === 30, "rotação gravada");

  await tkCard.locator(".close-adjust").click();
  await page.waitForTimeout(400);

  await page.selectOption("#weapon-all", "greatstaff");
  await page.waitForTimeout(1500);
  const fmCard = page.locator('.card-character[data-class="FM"]');
  await fmCard.locator(".toggle-adjust").click();
  await page.waitForTimeout(900);
  await fmCard.locator(".pos-x").fill("0.2");
  await fmCard.locator(".pos-x").dispatchEvent("input");
  await fmCard.locator(".save-mount").click();
  await page.waitForTimeout(900);
  const fmEntry = mountOf("FM", "greatstaff", "right");
  check(!!fmEntry, "segunda entrada (FM/greatstaff/right) gravada");
  check(
    !!fmEntry && fmEntry.position[0] === 0.2 && !!mountOf("TK", "axe-shield", "right"),
    "salvar uma classe preserva o ajuste da outra",
  );
  const payload = readMounts();
  check((payload?.mounts ?? []).length === 2, "arquivo soma ajustes sem perder os anteriores", `${(payload?.mounts ?? []).length}`);
  await fmCard.locator(".close-adjust").click();
  await page.waitForTimeout(400);

  const savedTk = tkEntry;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__MODEL_LAB__?.state().ready === true, null, { timeout: 90000 });
  await page.selectOption("#weapon-all", "axe-shield");
  await page.waitForTimeout(1200);
  const restored = await pieceOffset(page, "weapon-right-axe");
  check(
    !!restored &&
      !!savedTk &&
      Math.abs(restored.position[0] - savedTk.position[0]) < 1e-6 &&
      Math.abs(restored.position[1] - savedTk.position[1]) < 1e-6 &&
      Math.abs(restored.rotation[0] - (savedTk.rotation[0] * Math.PI) / 180) < 1e-6,
    "ajuste salvo volta aplicado depois de recarregar",
    JSON.stringify(restored ?? {}),
  );
  check(
    await page.locator('.card-character[data-class="TK"] .card-flag').isVisible(),
    "selo de ajustado depois de recarregar",
  );

  const tkCardAgain = page.locator('.card-character[data-class="TK"]');
  await tkCardAgain.locator(".toggle-adjust").click();
  await page.waitForTimeout(900);
  const sliders = {};
  for (const field of ["pos-x", "pos-y", "pos-z", "rot-x", "rot-y", "rot-z", "scale"]) {
    sliders[field] = await tkCardAgain.locator(`.${field}`).inputValue();
  }
  check(
    sliders["pos-y"] === String(savedTk?.position[1]) && sliders["rot-x"] === String(savedTk?.rotation[0]),
    "sliders abrem com o ajuste salvo depois de recarregar",
    JSON.stringify(sliders),
  );
  await tkCardAgain.locator(".save-mount").click();
  await page.waitForTimeout(900);
  const resavedTk = mountOf("TK", "axe-shield", "right");
  check(
    !!resavedTk &&
      resavedTk.position[1] === savedTk?.position[1] &&
      resavedTk.rotation[0] === savedTk?.rotation[0],
    "salvar de novo não zera o ajuste salvo",
    JSON.stringify(resavedTk ?? {}),
  );

  await page.selectOption("#weapon-all", "bow");
  await page.waitForTimeout(1200);
  await page.selectOption("#weapon-all", "axe-shield");
  await page.waitForTimeout(1200);
  const afterRoundTrip = await pieceOffset(page, "weapon-right-axe");
  check(
    !!afterRoundTrip &&
      !!savedTk &&
      Math.abs(afterRoundTrip.position[1] - savedTk.position[1]) < 1e-6 &&
      Math.abs(afterRoundTrip.rotation[0] - (savedTk.rotation[0] * Math.PI) / 180) < 1e-6,
    "ajuste salvo sobrevive a trocar e voltar de arma",
    JSON.stringify(afterRoundTrip ?? {}),
  );

  const beforeFailure = readMounts();
  await page.route(ENDPOINT, (route) => {
    if (route.request().method() === "POST") route.fulfill({ status: 500, body: "{}" });
    else route.continue();
  });
  await tkCardAgain.locator(".pos-y").fill("0.02");
  await tkCardAgain.locator(".pos-y").dispatchEvent("input");
  await tkCardAgain.locator(".save-mount").click();
  await page.waitForTimeout(900);
  const failureNote = (await tkCardAgain.locator(".adjust-note").textContent()) ?? "";
  check(failureNote.includes("Falha ao gravar"), "falha de gravação avisada", failureNote);
  check(
    JSON.stringify(readMounts()) === JSON.stringify(beforeFailure),
    "falha de gravação não altera o arquivo",
  );
  await page.unroute(ENDPOINT);
  consoleErrors.length = 0;

  await tkCardAgain.locator(".zero-mount").click();
  await page.waitForTimeout(900);
  const remaining = readMounts();
  check(
    (remaining?.mounts ?? []).some((entry) => entry.class === "FM"),
    "zerar remove só a peça escolhida",
  );
  check(
    !(remaining?.mounts ?? []).some((entry) => entry.class === "TK"),
    "entrada zerada sai do arquivo",
  );
  await tkCardAgain.locator(".close-adjust").click();
  await page.waitForTimeout(400);
  check(
    (await tkCardAgain.locator(".cam-corpo").getAttribute("aria-pressed")) === "true",
    "card volta para a câmera do corpo",
  );

  await page.locator('.tab[data-tab="monsters"]').click();
  await page.waitForTimeout(500);
  check(await page.locator("#view-monsters").isVisible(), "aba Monstros abre");
  check((await page.locator("#monster-grid .clip-chip").count()) >= 6, "chips de animação por monstro");
  check(
    (await page.locator("#monster-grid .clip-chip:not([disabled])").count()) === 0,
    "chips desabilitados sem GLB de malha",
  );
  check(
    (await page.locator('.tab[data-tab="chars"]').getAttribute("aria-selected")) === "false",
    "aba de personagens desmarcada",
  );

  check(consoleErrors.length === 0, "sem erro de console", consoleErrors.slice(0, 2).join(" | "));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
