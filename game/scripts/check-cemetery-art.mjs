import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseline = process.argv.includes("--baseline");
const quick = process.argv.includes("--quick");
const output = new URL("../art/evidence/cemetery/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1411, height: 827 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
page.on("requestfailed", (request) => process.stderr.write(`Recurso: ${request.url()} — ${request.failure()?.errorText}\n`));
await page.routeWebSocket(/127\.0\.0\.1:5173/, (socket) => socket.close());
await page.addInitScript(() => {
  window.__UAIDZIN_SKIP_BOOT__ = { id: "cemetery-art-isolated", name: "Cemitério", classId: "TK", level: 1, evolution: "Mortal", gold: 0 };
});
try {
  await page.goto(process.env.UAIDZIN_BASE || "http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__UAIDZIN__?.getSnapshot().entered, null, { timeout: 90000 });
  const entry = await page.evaluate(() => {
    const api = window.__UAIDZIN__;
    api.debugAddLevels(60 - api.session.progression.state.level);
    api.session.enemyAi.update = () => ({ wantsAttack: false });
    return api.enterDungeonById("dungeon-2");
  });
  assert.equal(entry.ok, true);
  process.stdout.write("Dungeon 2 aberta.\n");
  await page.waitForFunction(() => {
    const world = window.__UAIDZIN__.session.worlds.getCurrent();
    const props = world?.group.children.filter((node) => node.name.startsWith("prop-cemetery-"));
    return world?.id === "dungeon-2" && props?.length > 30 && props.every((node) => node.children.length > 0)
      && world.group.getObjectByName("ground").material.map.image?.width > 0;
  }, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  process.stdout.write("Modelos e materiais carregados.\n");
  await page.evaluate(() => {
    const session = window.__UAIDZIN__.session;
    session.camera.follow = () => {};
  });
  const views = quick ? [["final", [17, 21, -23], [0, 0, 0]]] : [
    ["overview", [22, 28, 31], [0, 0, 0]],
    ["mausoleum", [9, 9, -13], [0, 1.5, 0]],
    ["graves", [-7, 5, -10], [-12.5, 0.8, -14]],
    ["combat", [-1, 13, 10], [-8, 0, -4]],
  ];
  for (const [name, position, target] of views) {
    await page.evaluate(({ position, target }) => {
      const camera = window.__UAIDZIN__.session.camera.camera;
      camera.position.set(...position);
      camera.lookAt(...target);
    }, { position, target });
    await page.waitForTimeout(400);
    await page.screenshot({ path: fileURLToPath(new URL(`${baseline ? "before" : "after"}-${name}.png`, output)) });
    process.stdout.write(`Captura: ${name}\n`);
  }
  if (quick) {
    const result = await page.evaluate(() => {
      const session = window.__UAIDZIN__.session;
      const world = session.worlds.getCurrent();
      return {
        world: world.id,
        gravePlots: world.group.getObjectByName("cemetery-grave-soil")?.count,
        repairedObjects: world.group.children.filter((node) => node.name.startsWith("prop-cemetery-") && node.children.length > 0).length,
        shaderFailures: session.renderer.renderer.info.programs.filter((program) => program.diagnostics?.runnable === false).length,
      };
    });
    assert.equal(result.shaderFailures, 0);
    assert.equal(result.gravePlots, 16);
    assert.deepEqual(errors, []);
    await fs.writeFile(new URL("final-preview.json", output), JSON.stringify({ ...result, errors }, null, 2));
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
  const result = await page.evaluate(async () => {
    const api = window.__UAIDZIN__;
    const session = api.session;
    const world = session.worlds.getCurrent();
    const { positionBlocked } = await import("/src/world/collision.ts");
    const props = {};
    const materials = new Map();
    world.group.traverse((node) => {
      if (node.name.startsWith("prop-cemetery-")) props[node.name] = (props[node.name] || 0) + 1;
      if (!node.isMesh) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material.name.startsWith("cemetery-")) materials.set(material.name, { name: material.name, normal: !!material.normalMap, roughness: material.roughness });
      }
    });
    const routes = [[0, -10.5], [0, -5], [-5, -5], [-5, 0], [-5, 5], [0, 6], [5, 5], [5, 0], [5, -5], [0, -11.5]];
    return {
      props, materials: [...materials.values()], collision: world.collision,
      routes: routes.map(([x, z]) => ({ x, z, free: !positionBlocked(x, z, 0.4, world.collision) })),
      mausoleumBlocked: positionBlocked(0, 0, 0.4, world.collision),
      enemies: session.enemies.enemies.length,
      shaderFailures: session.renderer.renderer.info.programs.filter((program) => program.diagnostics?.runnable === false).length,
      grass: world.group.getObjectByName("cemetery-grass")?.count ?? 0,
      stones: world.group.getObjectByName("cemetery-stones")?.count ?? 0,
    };
  });
  assert.equal(result.props["prop-cemetery-mausoleum"], 1);
  assert.equal(result.props["prop-cemetery-tomb"], 16);
  assert.equal(result.props["prop-cemetery-tree"], 6);
  assert.equal(result.shaderFailures, 0);
  assert.ok(result.mausoleumBlocked);
  assert.ok(result.routes.every((route) => route.free), JSON.stringify(result.routes));
  assert.ok(result.enemies > 0);
  if (!baseline) {
    assert.ok(result.materials.filter((material) => material.normal).length >= 4);
    assert.ok(result.grass > 500 && result.stones > 50);
    const before = JSON.parse(await fs.readFile(new URL("before-qa.json", output), "utf8"));
    assert.deepEqual(result.collision, before.collision);
    await page.evaluate(() => window.__UAIDZIN__.toCity());
    await page.waitForFunction(() => window.__UAIDZIN__.session.worlds.getCurrentId() === "city");
    assert.equal((await page.evaluate(() => window.__UAIDZIN__.enterDungeonById("dungeon-2"))).ok, true);
    await page.waitForFunction(() => window.__UAIDZIN__.session.worlds.getCurrentId() === "dungeon-2");
    result.returned = true;
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL(`${baseline ? "before" : "after"}-qa.json`, output), JSON.stringify({ ...result, errors }, null, 2));
  process.stdout.write(JSON.stringify({ ...result, collision: undefined, errors }, null, 2) + "\n");
  }
} finally {
  await browser.close();
}
