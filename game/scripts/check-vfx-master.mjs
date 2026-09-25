import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.resolve(scriptDir, "..");
const configuredPath = process.env.VFX_STUDIO_PATH;
const targetIsUrl = Boolean(configuredPath && /^https?:\/\//i.test(configuredPath));
const targetPath = targetIsUrl
  ? configuredPath
  : path.resolve(configuredPath ?? path.join(gameDir, "vfx", "vfx_master.html"));
const targetUrl = targetIsUrl ? targetPath : pathToFileURL(targetPath).href;
const screenshotDir = process.env.VFX_SHOT_DIR
  ? path.resolve(process.env.VFX_SHOT_DIR)
  : null;
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

if (!fs.existsSync(targetPath) && !/^https?:\/\//i.test(targetPath)) {
  throw new Error(`HTML VFX não encontrado: ${targetPath}`);
}
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("requestfailed", (request) => {
  requestFailures.push(`${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`);
});

try {
  await page.goto(targetUrl, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.__VFX_STUDIO__?.ready === true, null, {
    timeout: 120000,
  });
  const initial = await page.evaluate(() => window.__VFX_STUDIO__.getDiagnostics());
  invariant(initial.skillCount === 96, `Esperadas 96 skills, recebido ${initial.skillCount}`);
  invariant(initial.versionCount === 288, `Esperadas 288 versões, recebido ${initial.versionCount}`);
  invariant(initial.errors.length === 0, `Erros internos: ${JSON.stringify(initial.errors)}`);

  const skillMatrix = await page.evaluate(() => {
    const api = window.__VFX_STUDIO__;
    const skills = window.UAIDZIN_SKILL_CATALOG.skills;
    const failures = [];
    let selected = 0;
    for (const skill of skills) {
      if (!api.selectSkill(skill.id)) {
        failures.push(`${skill.id}:select`);
        continue;
      }
      for (let version = 0; version < 3; version += 1) {
        if (!api.selectVersion(version)) {
          failures.push(`${skill.id}:v${version + 1}:select`);
          continue;
        }
        api.replay();
        api.replay();
        const diagnostics = api.getDiagnostics();
        if (diagnostics.selectedSystems < 1) failures.push(`${skill.id}:v${version + 1}:systems`);
        selected += 1;
      }
    }
    return { selected, failures };
  });
  invariant(skillMatrix.selected === 288, `Cobertura de skills ${skillMatrix.selected}/288`);
  invariant(
    skillMatrix.failures.length === 0,
    `Falhas na matriz de skills: ${skillMatrix.failures.slice(0, 20).join(", ")}`,
  );

  const comparison = await page.evaluate(() => {
    const api = window.__VFX_STUDIO__;
    api.setMode("game-skills");
    api.selectSkill("tk_mag_moon_ray");
    api.setCompare(true);
    const enabled = { diagnostics: api.getDiagnostics(), state: api.getState() };
    api.setCompare(false);
    return {
      enabled,
      disabled: { diagnostics: api.getDiagnostics(), state: api.getState() },
    };
  });
  invariant(comparison.enabled.state.compare === true, "API não habilitou comparação");
  invariant(comparison.enabled.diagnostics.rigPairCount === 3, `Comparação com ${comparison.enabled.diagnostics.rigPairCount} pares`);
  invariant(comparison.enabled.diagnostics.selectedSystems > 0, "Comparação sem sistemas ativos");
  invariant(comparison.disabled.state.compare === false, "API não desabilitou comparação");
  invariant(comparison.disabled.diagnostics.rigPairCount === 1, `Player normal com ${comparison.disabled.diagnostics.rigPairCount} par`);

  const packDiagnostics = await page.evaluate(() => window.__VFX_STUDIO__.getDiagnostics());
  const packMatrix = await page.evaluate((packIds) => {
    const api = window.__VFX_STUDIO__;
    const failures = [];
    api.setMode("vfx-pack");
    for (const id of packIds) {
      if (!api.selectPack(id)) {
        failures.push(`${id}:select`);
        continue;
      }
      api.replay();
      api.replay();
      if (api.getDiagnostics().selectedSystems < 1) failures.push(`${id}:systems`);
    }
    return { failures, state: api.getState() };
  }, packDiagnostics.packIds);
  invariant(
    packMatrix.failures.length === 0,
    `Falhas no VFX Pack: ${packMatrix.failures.slice(0, 20).join(", ")}`,
  );

  await page.evaluate(() => {
    const api = window.__VFX_STUDIO__;
    api.setMode("game-skills");
    api.selectSkill("tk_mag_moon_ray");
    api.selectVersion(2);
    api.setSidebar(true);
    api.replay();
  });
  await page.waitForTimeout(250);

  const layout = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    const result = await page.evaluate(() => {
      const diagnostics = window.__VFX_STUDIO__.getDiagnostics();
      return {
        diagnostics,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      };
    });
    invariant(result.diagnostics.layoutBoundsOk, `Layout fora do palco em ${viewport.width}x${viewport.height}`);
    invariant(result.scrollWidth <= viewport.width, `Overflow horizontal em ${viewport.width}x${viewport.height}`);
    invariant(result.scrollHeight <= viewport.height, `Overflow vertical em ${viewport.width}x${viewport.height}`);
    layout.push(result.diagnostics);
    if (screenshotDir) {
      await page.screenshot({
        path: path.join(screenshotDir, `vfx-${viewport.width}x${viewport.height}.png`),
        fullPage: false,
      });
    }
  }

  await page.evaluate(() => {
    const api = window.__VFX_STUDIO__;
    api.setMode("game-skills");
    api.selectSkill("tk_mag_moon_ray");
    api.selectVersion(2);
    api.replay();
  });
  await page.waitForTimeout(300);
  const finalDiagnostics = await page.evaluate(() => window.__VFX_STUDIO__.getDiagnostics());
  invariant(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(" | ")}`);
  invariant(pageErrors.length === 0, `Page errors: ${pageErrors.join(" | ")}`);
  invariant(requestFailures.length === 0, `Requests falhos: ${requestFailures.join(" | ")}`);
  invariant(finalDiagnostics.errors.length === 0, `Erros finais: ${JSON.stringify(finalDiagnostics.errors)}`);

  console.log(
    JSON.stringify(
      {
        target: targetPath,
        skills: initial.skillCount,
        versions: initial.versionCount,
        packSource: initial.packSource,
        packCount: initial.packCount,
        emptyPackRepairs: initial.emptyPackRepairs,
        shapeFallbacks: initial.shapeFallbacks,
        missingTextureFallbacks: finalDiagnostics.missingTextureFallbacks,
        viewports: layout.map((entry) => `${entry.viewport.width}x${entry.viewport.height}`),
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        requestFailures: requestFailures.length,
        finalSelectedSystems: finalDiagnostics.selectedSystems,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
