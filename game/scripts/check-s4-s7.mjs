import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed++;
  console.error("FAIL", m);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERR", e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONERR", msg.text());
});

await page.goto(BASE + "/tools/save-wipe.html?auto=all", {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
await page.waitForTimeout(700);

await page.goto(BASE + "/boot/01-login.html", {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
await page.fill("#user", "admin");
await page.fill("#pass", "admin");
await page.click("#btnLogin");
await page.waitForURL(/02-selecao/, { timeout: 20000 });
await page.waitForFunction(() => !!window.__mountCharPreview, null, {
  timeout: 10000,
});

await page.click("#btnCreateFirst");
await page.waitForTimeout(2500);

const modal = await page.evaluate(() => {
  const arts = [...document.querySelectorAll("#classPick .class-opt .art")];
  return {
    open: document.getElementById("modalCreate")?.classList.contains("open"),
    opts: arts.length,
    canvases: arts.map((a) => ({
      hasCanvas: !!a.querySelector("canvas.char-3d"),
      hasImg: !!a.querySelector("img"),
      w: a.querySelector("canvas")?.width || 0,
      h: a.querySelector("canvas")?.height || 0,
    })),
    ids: [...document.querySelectorAll("#classPick .class-opt")].map(
      (d) => d.dataset.classId,
    ),
  };
});
console.log("S4_MODAL", JSON.stringify(modal));
if (modal.open) ok("S4: modal aberto");
else fail("S4: modal fechado");
if (modal.opts === 4) ok("S4: 4 classes");
else fail("S4: opts " + modal.opts);
if (modal.canvases.every((c) => c.hasCanvas && !c.hasImg && c.w > 0))
  ok("S4: 3D canvas sem PNG");
else fail("S4: canvases " + JSON.stringify(modal.canvases));

const animProbe = await page.evaluate(async () => {
  const mount = window.__mountCharPreview;
  const hostTk = document.createElement("div");
  const hostBm = document.createElement("div");
  hostTk.style.cssText =
    "width:180px;height:280px;position:fixed;left:-9999px;top:0";
  hostBm.style.cssText = hostTk.style.cssText;
  document.body.appendChild(hostTk);
  document.body.appendChild(hostBm);
  const stopTk = mount(hostTk, "TK");
  const stopBm = mount(hostBm, "BM");
  await new Promise((r) => setTimeout(r, 2000));

  const result = {
    tkCanvas: !!hostTk.querySelector("canvas.char-3d"),
    bmCanvas: !!hostBm.querySelector("canvas.char-3d"),
  };
  stopTk();
  stopBm();
  hostTk.remove();
  hostBm.remove();

  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  const tk = await loader.loadAsync("/models/player/TK/TK.glb");
  const bm = await loader.loadAsync("/models/player/BM/BM.glb");
  const tkClip = tk.animations[0];
  const bmClip = bm.animations[0];
  result.tkClipName = tkClip?.name;
  result.bmClipName = bmClip?.name;
  result.tkTracks = tkClip?.tracks?.length;
  result.bmTracks = bmClip?.tracks?.length;
  result.trackNameOverlap = 0;
  if (tkClip && bmClip) {
    const tkNames = new Set(tkClip.tracks.map((t) => t.name));
    result.trackNameOverlap = bmClip.tracks.filter((t) =>
      tkNames.has(t.name),
    ).length;
  }

  const previewMod = await fetch("/boot/assets/char-preview.mjs").then((r) =>
    r.text(),
  );
  result.hasIdleFrom =
    /IDLE_FROM/.test(previewMod) && /TK:\s*["']BM["']/.test(previewMod);
  result.resolveIdle = /resolveIdleClip/.test(previewMod);
  return result;
});
console.log("S7_PROBE", JSON.stringify(animProbe));
if (animProbe.hasIdleFrom && animProbe.resolveIdle)
  ok("S7: remap TK->BM no char-preview");
else fail("S7: sem IDLE_FROM/resolveIdleClip");
if (animProbe.trackNameOverlap > 10)
  ok("S7: tracks BM batem com nomes TK (" + animProbe.trackNameOverlap + ")");
else fail("S7: overlap tracks baixo " + animProbe.trackNameOverlap);
if (animProbe.tkCanvas && animProbe.bmCanvas) ok("S7: previews TK/BM montam");
else fail("S7: canvas fail");

await page.click("#btnCreateCancel");
await page.waitForTimeout(200);
const closed = await page.evaluate(() => ({
  open: document.getElementById("modalCreate")?.classList.contains("open"),
  leftover: document.querySelectorAll("#classPick canvas.char-3d").length,
}));
if (!closed.open && closed.leftover === 0) ok("S4: dispose ao cancelar");
else fail("S4: dispose " + JSON.stringify(closed));

await browser.close();
console.log(failed ? "RESULT FAIL " + failed : "RESULT PASS");
process.exit(failed ? 1 : 0);
