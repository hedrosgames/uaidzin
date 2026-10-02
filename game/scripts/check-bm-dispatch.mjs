import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createCanvas() {
  const canvas = { width: 1, height: 1 };
  const gradient = () => ({ addColorStop() {} });
  const imageData = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  const context = {
    canvas,
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createImageData: imageData,
    getImageData: (_x, _y, w, h) => imageData(w, h),
  };
  for (const name of [
    "beginPath", "closePath", "moveTo", "lineTo", "arc", "ellipse", "rect",
    "quadraticCurveTo", "bezierCurveTo", "fill", "stroke", "fillRect", "strokeRect",
    "clearRect", "save", "restore", "translate", "rotate", "scale", "setTransform",
    "drawImage", "putImageData", "setLineDash", "transform", "clip",
  ]) context[name] = () => {};
  canvas.getContext = () => context;
  return canvas;
}

globalThis.Path2D = class {
  moveTo() {}
  lineTo() {}
  closePath() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  arc() {}
  ellipse() {}
  rect() {}
};
globalThis.document = {
  createElement(name) {
    if (name === "canvas") return createCanvas();
    return {
      style: {},
      classList: { toggle() {}, add() {}, remove() {} },
      appendChild() {},
      remove() {},
      setAttribute() {},
    };
  },
  createElementNS(_ns, name) {
    return this.createElement(name);
  },
};

const outFile = path.join(os.tmpdir(), `uaidzin-bm-dispatch-${process.pid}.mjs`);
await build({
  stdin: {
    contents: `
      export { BmAtlasVfxController } from "./src/presentation/effects/bmSkills/BmAtlasVfx";
      export { BM_DEDICATED_VFX_BY_SKILL_ID, isBmDedicatedVfx } from "./src/presentation/effects/bmSkills/BmAtlasDefs";
      export { getSkillVfxProfile } from "./src/presentation/effects/skill/SkillVfxCatalog";
      export { BM_FISICA, BM_CONTROLE, BM_MAGIA } from "./src/data/classes/skills/bm";
      export { Scene, Vector3 } from "three";
    `,
    resolveDir: root,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: outFile,
  logLevel: "silent",
});

const {
  BmAtlasVfxController,
  BM_DEDICATED_VFX_BY_SKILL_ID,
  isBmDedicatedVfx,
  getSkillVfxProfile,
  BM_FISICA,
  BM_CONTROLE,
  BM_MAGIA,
  Scene,
  Vector3,
} = await import(pathToFileURL(outFile).href);

const skills = [...BM_FISICA, ...BM_CONTROLE, ...BM_MAGIA].filter((s) => s.kind !== "passive");
for (const skill of skills) {
  const profile = getSkillVfxProfile(skill.id);
  if (!profile?.dedicatedVfx || !isBmDedicatedVfx(profile.dedicatedVfx)) {
    throw new Error(`missing dedicated BM vfx for ${skill.id}`);
  }
}

const scene = new Scene();
const ctrl = new BmAtlasVfxController(scene);
for (const skill of skills) {
  const profile = getSkillVfxProfile(skill.id);
  ctrl.cast(profile.dedicatedVfx, new Vector3(0, 0, 0), new Vector3(3, 0, 0), profile.radius || 2);
  for (let i = 0; i < 8; i++) ctrl.update(1 / 60);
}
ctrl.clear();
ctrl.dispose();
fs.unlinkSync(outFile);
console.log(`BM atlas ok: ${skills.length} skills, mappings=${Object.keys(BM_DEDICATED_VFX_BY_SKILL_ID).length}`);
