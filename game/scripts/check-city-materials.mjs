import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../art/evidence/city/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 680 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
await page.routeWebSocket(/127\.0\.0\.1:5173/, (socket) => socket.close());
try {
  await page.goto(process.env.UAIDZIN_BASE || "http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { GLTFLoader } = await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const { applyCityPropMaterials } = await import("/src/world/CityPropMaterials.ts");
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1200, 680);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setScissorTest(true);
    renderer.domElement.style.cssText = "position:fixed;inset:0;z-index:99999";
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x25282b);
    scene.add(new THREE.HemisphereLight(0x8090c0, 0x3a2a1c, 0.65));
    const key = new THREE.DirectionalLight(0xffdcb0, 2.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6f86d6, 0.5);
    fill.position.set(-3, 3, -3);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(35, 600 / 680, 0.01, 100);
    const label = document.createElement("div");
    label.style.cssText = "position:fixed;inset:18px 24px auto;z-index:100000;color:#eee;font:18px sans-serif;display:flex;justify-content:space-around;pointer-events:none";
    document.body.append(label);
    window.cityMaterialCheck = async (id) => {
      const loaded = await new GLTFLoader().loadAsync(`/models/city/${id}.glb`);
      const original = loaded.scene;
      const revised = original.clone(true);
      await applyCityPropMaterials(revised, id);
      const bounds = new THREE.Box3().setFromObject(original);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const distance = Math.max(size.x, size.y, size.z) * 2.25;
      camera.position.copy(center).add(new THREE.Vector3(0.8, 0.6, 1.2).normalize().multiplyScalar(distance));
      camera.lookAt(center);
      label.innerHTML = `<span>${id} · original</span><span>${id} · materiais revisados</span>`;
      scene.add(original);
      renderer.setViewport(0, 0, 600, 680);
      renderer.setScissor(0, 0, 600, 680);
      renderer.render(scene, camera);
      scene.remove(original);
      scene.add(revised);
      renderer.setViewport(600, 0, 600, 680);
      renderer.setScissor(600, 0, 600, 680);
      renderer.render(scene, camera);
      scene.remove(revised);
      const materials = [];
      const regions = [];
      revised.traverse((node) => {
        if (!node.isMesh) return;
        regions.push(node.userData.citySurfaceTriangles);
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          materials.push({ name: material.name, normal: !!material.normalMap, roughness: !!material.roughnessMap, metalness: material.metalness });
        }
      });
      const probes = id === "stall-2" ? [[980, 230], [1010, 430], [758, 460], [1035, 180]].map(([x, y]) => {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2((x - 600) / 600 * 2 - 1, 1 - y / 680 * 2), camera);
        const hit = ray.intersectObject(revised, true)[0];
        const material = hit && (Array.isArray(hit.object.material) ? hit.object.material[hit.face.materialIndex] : hit.object.material);
        return { screen: [x, y], uv: hit?.uv?.toArray(), point: hit?.point?.toArray(), material: material?.name };
      }) : [];
      return { id, materials, regions, probes, failedShaders: renderer.info.programs.filter((program) => program.diagnostics?.runnable === false).length };
    };
  });
  const results = [];
  for (const id of ["wall", "fountain", "wagon", "stall-1", "stall-2", "stall-bakery", "weapon-rack", "bulletin-board"]) {
    const result = await page.evaluate((id) => window.cityMaterialCheck(id), id);
    assert.equal(result.failedShaders, 0, id);
    assert.ok(result.materials.some((material) => material.normal && material.roughness), id);
    if (["wagon", "stall-1", "stall-2", "stall-bakery", "weapon-rack"].includes(id)) {
      assert.ok(result.materials.some((material) => material.name.endsWith("-cloth")), id);
      assert.ok(result.materials.some((material) => material.name.endsWith("-wood")), id);
    }
    if (id === "stall-2") assert.deepEqual(result.probes.map((probe) => probe.material), ["city-stall-2-cloth", "city-stall-2-wood", "city-stall-2-wood", "city-stall-2-wood"]);
    await page.screenshot({ path: fileURLToPath(new URL(`material-${id}.png`, output)) });
    results.push(result);
    process.stdout.write(`${id}: ${result.materials.map((material) => material.name).join(", ")}\n`);
  }
  await fs.writeFile(new URL("city-materials-qa.json", output), JSON.stringify({ results, errors }, null, 2));
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
