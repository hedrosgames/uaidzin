import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidence = path.join(game, "vfx/evidence");
await fs.mkdir(evidence, { recursive:true });
if (!process.env.AGENT_BROWSER_CDP) throw new Error("Abra o painel do lab e configure AGENT_BROWSER_CDP.");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
async function evaluate(source) {
  let stdout;
  try {
    ({ stdout } = await exec(binary, ["--cdp", process.env.AGENT_BROWSER_CDP, "--json", "eval", "-b", Buffer.from(source).toString("base64")], { maxBuffer:24 * 1024 * 1024, timeout:120000 }));
  } catch (error) {
    let message = "Falha na conexão com o painel CDP.";
    try { message = JSON.parse(error.stdout).error ?? message; } catch {}
    throw new Error(message);
  }
  const payload = JSON.parse(stdout);
  if (!payload.success) throw new Error(payload.error);
  return payload.data.result;
}

const audit = await evaluate("window.__VFX_LAB__.audit()");
assert([96, 192, 288].includes(audit.total));
assert.equal(audit.remainingObjects, 0);
const versions = await evaluate("window.__VFX_LAB__.versions");
const samples = [
  "tk_fis_force_wave", "tk_fis_fire_burst", "tk_fis_earthquake", "tk_mag_moon_ray",
  "fm_mag_nevasca", "fm_mag_choque_vital", "fm_mag_picada", "fm_mag_sombra_corrosiva",
  "bm_mag_corrente_agua", "bm_ctrl_dragao", "ht_mag_tempestade",
];
for (const version of versions) for (const id of samples) {
  const [image] = await evaluate(`window.__VFX_LAB__.select(${JSON.stringify(id)},${JSON.stringify(version)});window.__VFX_LAB__.seek(0.85);window.__VFX_LAB__.capture()`);
  await fs.writeFile(path.join(evidence, `${version}-${id}.png`), Buffer.from(image.split(",")[1], "base64"));
}
const result = { audit, versions, captures:samples.length * versions.length, method:"Canvas WebGL via painel CDP; Playwright bloqueado pelo bridge (Target.createTarget indisponível)." };
await fs.writeFile(path.join(evidence, "technical-results.json"), JSON.stringify(result, null, 2));
console.info(JSON.stringify(result));
