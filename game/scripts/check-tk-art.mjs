import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../art/evidence/tk/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
let page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
await page.routeWebSocket(/127\.0\.0\.1:5173/, (socket) => socket.close());
try {
  await page.goto(process.env.UAIDZIN_BASE || "http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { PlayerView } = await import("/src/presentation/player/PlayerView.ts");
    const player = new PlayerView();
    await player.load("TK");
    player.setArmorAuraEnabled(false);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f2023);
    scene.add(player.root);
    scene.add(new THREE.HemisphereLight(0x8090c0, 0x3a2a1c, 0.55));
    const key = new THREE.DirectionalLight(0xffdcb0, 2.1);
    key.position.set(14, 22, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6f86d6, 0.35);
    fill.position.set(-10, 6, -8);
    scene.add(fill);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), new THREE.MeshStandardMaterial({ color: 0x34312c, roughness: 0.94 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.005;
    scene.add(floor);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1300, 900);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setScissorTest(true);
    renderer.domElement.style.cssText = "position:fixed;inset:0;z-index:99999";
    document.body.append(renderer.domElement);
    const label = document.createElement("div");
    label.style.cssText = "position:fixed;inset:24px 0 auto;z-index:100000;color:#e5dac5;font:18px sans-serif;display:flex;justify-content:space-around;pointer-events:none";
    label.innerHTML = "<span>TK · antes</span><span>TK · materiais revisados</span>";
    document.body.append(label);
    const camera = new THREE.PerspectiveCamera(32, 650 / 900, 0.01, 100);
    const surfaces = [];
    player.root.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.material.userData.artProfile) return;
      const revised = mesh.material;
      const original = new THREE.MeshStandardMaterial({ map: revised.map, color: 0xffffff, roughness: 0.75, metalness: 0, side: THREE.DoubleSide });
      surfaces.push({ mesh, revised, original });
    });
    window.tkCapture = (angle, close = false) => {
      player.root.rotation.y = angle;
      camera.position.set(0, close ? 1.67 : 1.22, close ? 1.8 : 4.8);
      camera.lookAt(0, close ? 1.46 : 0.94, 0);
      for (const [index, finish] of ["original", "revised"].entries()) {
        for (const surface of surfaces) surface.mesh.material = surface[finish];
        renderer.setViewport(index * 650, 0, 650, 900);
        renderer.setScissor(index * 650, 0, 650, 900);
        renderer.render(scene, camera);
      }
    };
    window.tkCapture(0.25);
    const skeletons = [];
    player.root.traverse((mesh) => {
      if (mesh.isSkinnedMesh && mesh.name !== "PlayerOcclusionGhost") skeletons.push({ name: mesh.name, bones: mesh.skeleton.bones.length, vertices: mesh.geometry.attributes.position.count });
    });
    window.tkPlayer = player;
    window.tkRenderer = renderer;
    return { surfaces: surfaces.length, profiles: surfaces.map((surface) => surface.revised.userData.artProfile), skeletons, actions: [...player.actions.keys()], shaderFailures: renderer.info.programs.filter((program) => program.diagnostics?.runnable === false).length };
  });
  assert.equal(result.surfaces, 1);
  assert.equal(result.shaderFailures, 0);
  await page.screenshot({ path: fileURLToPath(new URL("tk-comparison-front.png", output)) });
  await page.evaluate(() => window.tkCapture(0.45, true));
  await page.screenshot({ path: fileURLToPath(new URL("tk-comparison-detail.png", output)) });
  await page.evaluate(() => window.tkCapture(Math.PI + 0.3));
  await page.screenshot({ path: fileURLToPath(new URL("tk-comparison-back.png", output)) });
  result.animation = await page.evaluate(() => {
    const player = window.tkPlayer;
    const before = player.mixer.time;
    player.setPose(0, 0, 0.25, true);
    player.mixer.update(0.2);
    const runActive = player.actions.get("run").isRunning();
    player.setPose(0, 0, 0.25, false);
    player.playAttack();
    player.mixer.update(0.15);
    const attackActive = player.actions.get("attack").isRunning();
    window.tkCapture(0.25);
    let finiteBones = true;
    player.model.traverse((mesh) => {
      if (mesh.isSkinnedMesh) finiteBones &&= mesh.skeleton.bones.every((bone) => bone.matrixWorld.elements.every(Number.isFinite));
    });
    return { advanced: player.mixer.time > before, finiteBones, runActive, attackActive };
  });
  assert.ok(Object.values(result.animation).every(Boolean));
  await page.close();
  const game = await browser.newPage({ viewport: { width: 1411, height: 827 } });
  game.on("pageerror", (error) => errors.push(error.message));
  game.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  await game.routeWebSocket(/127\.0\.0\.1:5173/, (socket) => socket.close());
  await game.addInitScript(() => {
    window.__UAIDZIN_SKIP_BOOT__ = { id: "tk-art-isolated", name: "Thegn", classId: "TK", level: 5, evolution: "Mortal", gold: 0 };
  });
  await game.goto(process.env.UAIDZIN_BASE || "http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await game.waitForFunction(() => window.__UAIDZIN__?.session?.renderer.playerView.ready && window.__UAIDZIN__.getSnapshot().entered, null, { timeout: 90000 });
  await game.waitForFunction(() => {
    const world = window.__UAIDZIN__.session.worlds.getCurrent();
    const props = world?.group.children.filter((node) => node.name.startsWith("prop-"));
    return world?.group.getObjectByName("fountain-water") && props?.length > 8 && props.every((node) => node.children.length > 0);
  }, null, { timeout: 60000 });
  await game.evaluate(() => {
    const session = window.__UAIDZIN__.session;
    window.tkRenderFrame = session.renderer.render.bind(session.renderer);
    session.renderer.render = () => {};
    window.tkRenderFrame(session.camera.camera);
  });
  await game.screenshot({ path: fileURLToPath(new URL("tk-city-game.png", output)) });
  await game.evaluate(() => {
    const session = window.__UAIDZIN__.session;
    session.camera.offset.set(2.6, 2.9, 4.8);
    session.camera.snapTo(session.player.x, session.player.z);
    window.tkRenderFrame(session.camera.camera);
  });
  await game.waitForTimeout(200);
  await game.screenshot({ path: fileURLToPath(new URL("tk-city-detail.png", output)) });
  result.runtime = await game.evaluate(() => {
    const session = window.__UAIDZIN__.session;
    const profiles = [];
    session.renderer.playerView.root.traverse((mesh) => {
      if (mesh.material?.userData.artProfile) profiles.push(mesh.material.userData.artProfile);
    });
    return { profiles, shaderFailures: session.renderer.renderer.info.programs.filter((program) => program.diagnostics?.runnable === false).length };
  });
  assert.deepEqual(result.runtime.profiles, ["tk-aged-gold"]);
  assert.equal(result.runtime.shaderFailures, 0);
  await game.close();
  page = await browser.newPage({ viewport: { width: 650, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  await page.routeWebSocket(/127\.0\.0\.1:5173/, (socket) => socket.close());
  await page.route("**/__tk-art-preview", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body style='background:#241c14'></body></html>" }));
  await page.goto(`${process.env.UAIDZIN_BASE || "http://127.0.0.1:5173"}/__tk-art-preview`, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ type: "importmap", content: JSON.stringify({ imports: { three: "/vendor/three/three.module.js", "three/addons/": "/vendor/three/addons/" } }) });
  await page.evaluate(async () => {
    document.body.replaceChildren();
    const host = document.createElement("div");
    host.style.cssText = "width:600px;height:850px;margin:auto";
    document.body.append(host);
    const { mountCharPreview } = await import("/boot/assets/char-preview.mjs");
    window.tkPreview = mountCharPreview(host, "TK");
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: fileURLToPath(new URL("tk-selection-preview.png", output)) });
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL("validation.json", output), JSON.stringify({ ...result, errors }, null, 2));
  process.stdout.write(JSON.stringify(result) + "\n");
} finally {
  await browser.close();
}
