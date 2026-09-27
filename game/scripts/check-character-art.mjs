import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../art/evidence/characters/", import.meta.url);
const baseline = process.argv.includes("--baseline");
const base = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];
try {
  for (const classId of ["FM", "BM", "HT"]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
    await page.route("**/__character-art", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }));
    await page.goto(`${base}/__character-art`);
    const result = await page.evaluate(async (classId) => {
      const T = await import("/node_modules/three/build/three.module.js");
      const { PlayerView } = await import("/src/presentation/player/PlayerView.ts");
      const player = new PlayerView();
      await player.load(classId);
      player.setArmorAuraEnabled(false);
      for (const root of player.weaponRig.getVisualRoots()) root.visible = false;
      const scene = new T.Scene();
      scene.background = new T.Color(0x1f2023);
      scene.add(player.root);
      scene.add(new T.HemisphereLight(0x8090c0, 0x3a2a1c, 0.55));
      const key = new T.DirectionalLight(0xffdcb0, 2.1);
      key.position.set(14, 22, 10);
      scene.add(key);
      const fill = new T.DirectionalLight(0x6f86d6, 0.35);
      fill.position.set(-10, 6, -8);
      scene.add(fill);
      const floor = new T.Mesh(new T.CircleGeometry(1.7, 64), new T.MeshStandardMaterial({ color: 0x34312c, roughness: 0.94 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.005;
      scene.add(floor);
      const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(1200, 820);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setScissorTest(true);
      renderer.domElement.style.cssText = "position:fixed;inset:0";
      document.body.append(renderer.domElement);
      const label = document.createElement("div");
      label.style.cssText = "position:fixed;inset:20px 0 auto;color:#e5dac5;font:18px sans-serif;display:flex;justify-content:space-around";
      label.innerHTML = `<span>${classId} · antes</span><span>${classId} · materiais revisados</span>`;
      document.body.append(label);
      const camera = new T.PerspectiveCamera(32, 600 / 820, 0.01, 100);
      const surfaces = [];
      player.model.traverse((mesh) => {
        if (!mesh.isSkinnedMesh || mesh.name === "PlayerOcclusionGhost") return;
        const revised = mesh.material;
        const original = new T.MeshStandardMaterial({ map: revised.map, color: 0xffffff, roughness: 0.75, metalness: 0, side: T.DoubleSide });
        surfaces.push({ mesh, revised, original });
      });
      window.captureCharacter = (angle, close = false) => {
        player.root.rotation.y = angle;
        camera.position.set(0, close ? 1.6 : 1.22, close ? 2.3 : 4.8);
        camera.lookAt(0, close ? 1.43 : 0.94, 0);
        for (const [index, finish] of ["original", "revised"].entries()) {
          for (const surface of surfaces) surface.mesh.material = surface[finish];
          renderer.setViewport(index * 600, 0, 600, 820);
          renderer.setScissor(index * 600, 0, 600, 820);
          renderer.render(scene, camera);
        }
      };
      window.captureCharacter(0.2);
      window.characterPlayer = player;
      window.characterRenderer = renderer;
      return { classId, surfaces: surfaces.length, profiles: surfaces.map((surface) => surface.revised.userData.artProfile ?? null), skeletons: surfaces.map(({ mesh }) => ({ bones: mesh.skeleton.bones.length, vertices: mesh.geometry.attributes.position.count })), shaderFailures: renderer.info.programs.filter((program) => program.diagnostics?.runnable === false).length };
    }, classId);
    assert.equal(result.shaderFailures, 0);
    if (!baseline) assert.ok(result.profiles.every(Boolean));
    for (const [view, angle, close] of [["front", 0.2, false], ["detail", 0.35, true], ["back", Math.PI + 0.25, false]]) {
      await page.evaluate(([angle, close]) => window.captureCharacter(angle, close), [angle, close]);
      await page.screenshot({ path: fileURLToPath(new URL(`${classId.toLowerCase()}-${baseline ? "baseline" : "comparison"}-${view}.png`, output)) });
    }
    result.animation = await page.evaluate(() => {
      const player = window.characterPlayer;
      player.setPose(0, 0, 0, true);
      player.update(0.2);
      const run = player.actions.get("run").isRunning();
      player.setPose(0, 0, 0, false);
      player.playAttack();
      player.update(0.15);
      const attack = player.actions.get("attack").isRunning() || player.actions.get("cast").isRunning();
      let finite = true;
      player.model.traverse((mesh) => {
        if (mesh.isSkinnedMesh) finite &&= mesh.skeleton.bones.every((bone) => bone.matrixWorld.elements.every(Number.isFinite));
      });
      return { run, attack, finite };
    });
    assert.ok(Object.values(result.animation).every(Boolean));
    results.push(result);
    await page.close();
    process.stdout.write(`${classId}: materiais e animações verificados.\n`);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL(`${baseline ? "baseline" : "validation"}.json`, output), JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
}
