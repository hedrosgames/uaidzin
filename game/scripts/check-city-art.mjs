import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
const output = new URL("../art/evidence/city/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1411, height: 827 } });
await page.routeWebSocket(/127\.0\.0\.1:5173/, (socket) => socket.close());
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await page.addInitScript(() => {
  window.__UAIDZIN_SKIP_BOOT__ = { id: "city-art-isolated", name: "Cidade", classId: "TK", level: 5, evolution: "Mortal", gold: 0 };
});
try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__UAIDZIN__?.getSnapshot().entered, null, { timeout: 90000 });
  await page.waitForFunction(() => {
    const world = window.__UAIDZIN__.session.worlds.getCurrent();
    const props = world?.group.children.filter((node) => node.name.startsWith("prop-"));
    return world?.group.getObjectByName("fountain-water") && world.group.getObjectByName("ground")?.material.map.image?.width > 0
      && props?.length > 8 && props.every((node) => node.children.length > 0);
  }, null, { timeout: 60000 });
  await page.waitForTimeout(1800);
  const scene = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const session = api.session;
    const world = session.worlds.getCurrent();
    const ground = world.group.getObjectByName("ground");
    const water = world.group.getObjectByName("fountain-water");
    const grass = world.group.getObjectByName("city-grass");
    const fountain = world.group.getObjectByName("prop-fountain");
    const fountainStone = [];
    const surfaceMaterials = new Set();
    world.group.traverse((node) => {
      if (!node.isMesh) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material.normalMap && material.roughnessMap) surfaceMaterials.add(material.name);
      }
    });
    fountain.traverse((node) => {
      if (node.userData.removedWaterTriangles != null) fountainStone.push({ removed: node.userData.removedWaterTriangles, roughness: node.material.roughness });
    });
    const fire = world.group.getObjectByName("brazier-0-flame");
    const offset = fire.material.map.offset.clone();
    const fireTick = world.tickables.find((tick) => tick.group?.name === "brazier-0");
    fireTick.update(0.12);
    const frameChanged = !offset.equals(fire.material.map.offset);
    const waterTick = world.tickables.find((tick) => tick.root?.name === "fountain-water");
    const waterTime = waterTick.time.value;
    waterTick.update(0.5);
    const uniforms = session.renderer.renderer.info.programs.filter((program) => program.diagnostics?.runnable === false).length;
    const info = session.renderer.renderer.info;
    info.autoReset = false;
    info.reset();
    session.renderer.render(session.camera.camera);
    const render = { ...info.render };
    info.autoReset = true;
    return {
      texture: ground.material.map.image.currentSrc || ground.material.map.image.src,
      textureSize: [ground.material.map.image.width, ground.material.map.image.height],
      waterSurfaces: water.children.filter((node) => node.name.startsWith("fountain-water-surface")).length,
      waterFalls: water.children.filter((node) => node.name.startsWith("fountain-water-fall")).length,
      waterImpacts: water.children.filter((node) => node.name.startsWith("fountain-impact")).length,
      waterAnimated: waterTick.time.value > waterTime + 0.49,
      charcoalCount: world.group.getObjectByName("brazier-0-charcoal").count,
      surfaceMaterials: [...surfaceMaterials].sort(),
      fountainStone, grassCount: grass.count, flameIsSprite: fire.isSprite,
      fireFrameChanged: frameChanged, shaderFailures: uniforms,
      renderer: render,
    };
  });
  assert.match(scene.texture, /city-granite-albedo/);
  assert.equal(scene.waterSurfaces, 2);
  assert.equal(scene.waterFalls, 7);
  assert.equal(scene.waterImpacts, 7);
  assert.equal(scene.charcoalCount, 23);
  assert.ok(scene.waterAnimated);
  assert.ok(scene.surfaceMaterials.includes("city-wagon-cloth"));
  assert.ok(scene.surfaceMaterials.includes("city-wall-stone"));
  assert.ok(scene.surfaceMaterials.includes("city-weapon-rack-iron"));
  assert.ok(scene.fountainStone.some((stone) => stone.removed > 0 && stone.roughness > 0.8));
  assert.ok(scene.grassCount > 500);
  assert.ok(scene.flameIsSprite && scene.fireFrameChanged);
  assert.equal(scene.shaderFailures, 0);
  assert.ok(scene.renderer.frame > 0);
  await page.screenshot({ path: new URL("city-natural-game.png", output).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1") });
  await page.evaluate(() => {
    const session = window.__UAIDZIN__.session;
    session.camera.offset.set(15, 19, 23);
    session.camera.snapTo(0, 0);
  });
  process.stdout.write("Cena carregada e materiais verificados.\n");
  await page.waitForTimeout(500);
  await page.screenshot({ path: new URL("city-natural-overview.png", output).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1") });
  const navigation = await page.evaluate(() => {
    const api = window.__UAIDZIN__;
    const session = api.session;
    const world = session.worlds.getCurrent();
    const results = [];
    for (const service of world.interactables.filter((entry) => entry.kind === "npc" || entry.kind === "chest")) {
      api.closePanels();
      api.teleportPlayer(0, 4);
      api.queueInteractById(service.id);
      for (let step = 0; step < 1800 && session.pendingInteract; step++) {
        session.player.update(1 / 60, 0, 0, world.boundary, world.collision);
        session.resolvePendingInteract();
      }
      results.push({ id: service.id, distance: Math.hypot(session.player.x - service.x, session.player.z - service.z), panel: api.getSnapshot().panelsOpen });
    }
    api.closePanels();
    api.teleportPlayer(0, 4);
    session.player.setMoveTarget(0, 0);
    for (let step = 0; step < 300; step++) session.player.update(1 / 60, 0, 0, world.boundary, world.collision);
    const fountainDistance = Math.hypot(session.player.x, session.player.z);
    api.teleportPlayer(5, -6);
    api.queueInteractById("npc-portal-guard");
    for (let step = 0; step < 900 && session.pendingInteract; step++) {
      session.player.update(1 / 60, 0, 0, world.boundary, world.collision);
      session.resolvePendingInteract();
    }
    const guardFromEast = { distance: Math.hypot(session.player.x, session.player.z + 10), panel: api.getSnapshot().panelsOpen };
    api.closePanels();
    return { services: results, guardFromEast, fountainDistance };
  });
  assert.ok(navigation.services.filter((result) => result.id !== "npc-portal-guard").every((result) => result.distance <= 1.6 && result.panel), JSON.stringify(navigation));
  assert.ok(navigation.guardFromEast.distance <= 1.6 && navigation.guardFromEast.panel);
  assert.ok(navigation.fountainDistance >= 2);
  process.stdout.write("Circulação: " + JSON.stringify(navigation) + "\n");
  await page.evaluate(() => {
    const session = window.__UAIDZIN__.session;
    session.camera.follow = () => {};
    session.camera.camera.position.set(4, 5, 6);
    session.camera.camera.lookAt(0, 1.1, 0);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: new URL("city-natural-fountain.png", output).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1") });
  for (const [view, position] of [["front", [9, 3.7, 10]], ["side", [4, 3.4, 8]]]) {
    await page.evaluate((position) => {
      const camera = window.__UAIDZIN__.session.camera.camera;
      camera.position.set(...position);
      camera.lookAt(6.8, 1.45, 6.8);
    }, position);
    await page.waitForTimeout(350);
    await page.screenshot({ path: new URL(`city-fire-${view}.png`, output).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1") });
  }
  const dungeon = await page.evaluate(() => window.__UAIDZIN__.enterDungeonById("dungeon-1"));
  process.stdout.write("Entrada na dungeon: " + JSON.stringify(dungeon) + "\n");
  assert.equal(dungeon.ok, true);
  await page.waitForFunction(() => window.__UAIDZIN__.session.worlds.getCurrentId() === "dungeon-test");
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__UAIDZIN__.toCity());
  await page.waitForFunction(() => window.__UAIDZIN__.session.worlds.getCurrentId() === "city");
  await page.waitForTimeout(400);
  const returned = await page.evaluate(() => {
    const world = window.__UAIDZIN__.session.worlds.getCurrent();
    let waters = 0;
    world.group.traverse((node) => { if (node.name === "fountain-water") waters++; });
    return { waters, grass: world.group.getObjectByName("city-grass").count };
  });
  assert.equal(returned.waters, 1);
  assert.equal(returned.grass, scene.grassCount);
  await fs.writeFile(new URL("city-natural-qa.json", output), JSON.stringify({ scene, navigation, returned, errors }, null, 2));
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ scene, navigation, returned, errors }, null, 2) + "\n");
} finally {
  await browser.close();
}
