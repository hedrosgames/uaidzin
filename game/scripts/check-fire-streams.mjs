import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const baseUrl = process.env.FIRE_BURST_3D_URL ?? "http://127.0.0.1:5173/vfx/fire-burst-3d.html";
const evidence = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vfx/evidence");
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");

async function command(...args) {
  const { stdout } = await exec(binary, ["--cdp", process.env.AGENT_BROWSER_CDP, "--json", ...args], {
    timeout: 120000,
    maxBuffer: 12 * 1024 * 1024,
  });
  const response = JSON.parse(stdout);
  if (!response.success) throw new Error(response.error);
  return response.data;
}

async function evaluate(code) {
  return (await command("eval", "-b", Buffer.from(code).toString("base64"))).result;
}

await command("open", `${baseUrl}?qa=1`);
await command("wait", "--fn", "Boolean(window.__FIRE_BURST_3D__?.getState().ready)");
const preview = await evaluate(`(async () => {
  const api = window.__FIRE_BURST_3D__;
  api.seek(0.82);
  const first = api.getState();
  api.play();
  for (let attempt = 0; attempt < 100 && api.getState().time === first.time; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  const moved = api.getState().time !== first.time;
  api.pause();
  const pause = api.getState().time;
  await new Promise(resolve => setTimeout(resolve, 100));
  const stable = api.getState().time === pause;
  api.seek(2.6);
  const end = api.getState();
  api.seek(0.82);
  return { first, moved, stable, end };
})()`);
assert(preview.moved, "Reprodução da prévia não avançou");
assert(preview.stable, "Prévia não permaneceu pausada");
assert.equal(preview.first.frame, Math.floor(0.82 * 24));
assert.equal(preview.end.frame, Math.floor(2.6 * 24));
const capture = await evaluate(`(() => {
  const api = window.__FIRE_BURST_3D__;
  api.seek(0.82);
  return api.renderer.domElement.toDataURL('image/png');
})()`);
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(evidence, "fire-burst-3d-approved.png"), Buffer.from(capture.split(",")[1], "base64"));
process.stdout.write(`${JSON.stringify({ preview }, null, 2)}\n`);
