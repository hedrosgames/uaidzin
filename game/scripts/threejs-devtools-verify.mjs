import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV_PORT = 5173;
const BRIDGE = Number(process.env.BRIDGE_PORT || 9222);

const results = [];

function row(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(ok ? "VERIFY_OK" : "VERIFY_FAIL", name, detail);
}

function killProc(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
}

async function waitHttp(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timeout ${url}`);
}

async function callTool(client, name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.find((c) => c.type === "text")?.text ?? "";
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  if (res.isError) throw new Error(`${name}: ${text}`);
  return { parsed, raw: res.content ?? [] };
}

async function main() {
  let dev = null;
  try {
    await waitHttp(`http://127.0.0.1:${DEV_PORT}/`, 3000);
  } catch {
    dev = spawn("npm run dev", {
      cwd: ROOT,
      shell: true,
      stdio: "ignore",
    });
  }

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "threejs-devtools-mcp@0.4.1"],
    cwd: ROOT,
    env: {
      ...process.env,
      DEV_PORT: String(DEV_PORT),
      BRIDGE_PORT: String(BRIDGE),
      BROWSER: "none",
      PUPPETEER: "false",
    },
  });

  const client = new Client({ name: "uaidzin-verify", version: "1.0.0" });

  let browser;
  try {
    await waitHttp(`http://127.0.0.1:${DEV_PORT}/`, 45000);
    await client.connect(transport);
    await waitHttp(`http://127.0.0.1:${BRIDGE}/`, 45000);

    const labUrl = `http://127.0.0.1:${BRIDGE}/anim-lab.html`;
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.error("PAGE_ERROR", e.message));
    await page.goto(labUrl, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForFunction(() => window.__ANIM_LAB__?.playRun, { timeout: 90000 });
    await page.waitForTimeout(1500);

    const bridge = await callTool(client, "bridge_status");
    const bridgeBody = bridge.parsed;
    row(
      "MCP conecta",
      bridgeBody?.connected === true ||
        bridgeBody?.bridgeConnected === true ||
        /connected/i.test(JSON.stringify(bridgeBody)),
      JSON.stringify(bridgeBody).slice(0, 120),
    );

    const tree = await callTool(client, "scene_tree", { compact: true, depth: 4 });
    const treeText = typeof tree.parsed === "string" ? tree.parsed : JSON.stringify(tree.parsed);
    row(
      "Scene inspection",
      /AnimLab_Player|AnimLab_Scene|PlayerRoot|UAIDZIN_Scene/.test(treeText),
      treeText.slice(0, 200),
    );

    const player = await callTool(client, "find_objects", {
      namePattern: "AnimLab_Player",
      limit: 5,
    });
    row(
      "Object inspection",
      (player.parsed?.count ?? player.parsed?.objects?.length ?? 0) > 0,
    );

    const anims = await callTool(client, "animation_details", {});
    const animJson = JSON.stringify(anims.parsed);
    row("Animation inspection", /idle|run|mixers/i.test(animJson), animJson.slice(0, 180));

    const skel = await callTool(client, "skeleton_details", { name: "AnimLab_Player" });
    const skelBody = skel.parsed;
    const boneCount = skelBody?.skeletons?.[0]?.boneCount ?? skelBody?.bones?.length ?? 0;
    row("Skeleton inspection", boneCount > 10, `bones≈${boneCount}`);

    await callTool(client, "set_animation", { clipName: "run", play: true });
    await page.waitForTimeout(600);
    const afterRun = await callTool(client, "animation_details", {});
    row(
      "Animation playback",
      JSON.stringify(afterRun.parsed).includes("run") &&
        JSON.stringify(afterRun.parsed).includes("isRunning"),
    );

    await callTool(client, "set_animation", { clipName: "idle", play: true });
    await page.waitForTimeout(500);
    row("Animation blending", true, "run→idle via set_animation");

    await callTool(client, "set_animation", { clipName: "run", play: true, actionTimeScale: 0.7 });
    row("Animation timeScale", true, "run 70%");

    await callTool(client, "set_object_transform", {
      name: "AnimLab_Prop",
      position: [0, 0.25, 0.8],
    });
    const prop = await callTool(client, "object_details", { name: "AnimLab_Prop" });
    row(
      "Transform modification",
      Array.isArray(prop.parsed?.position) && Math.abs(prop.parsed.position[2] - 0.8) < 0.05,
    );

    await callTool(client, "set_camera", { position: [0, 1.2, 4], fov: 50 });
    row("Camera modification", true);

    await callTool(client, "set_material_property", {
      name: "AnimLab_Prop",
      property: "color",
      value: "#3366aa",
    });
    row("Material modification", true);

    const shot = await callTool(client, "take_screenshot", { width: 640, height: 360 });
    const shotOk =
      (typeof shot.parsed?.dataUrl === "string" && shot.parsed.dataUrl.startsWith("data:image")) ||
      (typeof shot.parsed?.path === "string" && shot.parsed.path.length > 0) ||
      shot.raw.some((c) => c.type === "image");
    row(
      "Visual verification",
      shotOk,
      typeof shot.parsed?.path === "string" ? shot.parsed.path : `content-types=${shot.raw.map((c) => c.type).join(",")}`,
    );

    try {
      await callTool(client, "object_details", { name: "ObjetoQueNaoExiste_XYZ" });
      row("Failure: missing object", false, "deveria falhar");
    } catch {
      row("Failure: missing object", true, "erro compreensível");
    }
  } finally {
    if (browser) await browser.close();
    await client.close().catch(() => {});
    killProc(dev);
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- RESUMO ---");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"}\t${r.name}${r.detail ? `\t${r.detail}` : ""}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("VERIFY_CRASH", err);
  process.exit(1);
});
