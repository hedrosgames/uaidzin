import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const treeArg = process.argv[2] || "fisica";
assert.equal(treeArg, "fisica", `Árvore não suportada: ${treeArg}`);

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
    "drawImage", "putImageData", "setLineDash",
  ]) context[name] = () => {};
  canvas.getContext = () => context;
  return canvas;
}

globalThis.document = {
  createElement(name) {
    if (name === "canvas") return createCanvas();
    return {
      id: "",
      className: "",
      style: {},
      hidden: false,
      classList: { toggle() {}, add() {}, remove() {} },
      appendChild() {},
      remove() {},
      setAttribute() {},
    };
  },
};

const compiled = await build({
  stdin: {
    contents: `
      export { EffectManager } from "./src/presentation/effects/EffectManager";
      export { TK_FISICA } from "./src/data/classes/skills/tk";
      export { getSkillVfxProfile } from "./src/presentation/effects/skill/SkillVfxCatalog";
      export { Scene, PerspectiveCamera, Vector3 } from "three";
    `,
    resolveDir: root,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});

const { EffectManager, TK_FISICA, getSkillVfxProfile, Scene, PerspectiveCamera, Vector3 } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);

assert(Array.isArray(TK_FISICA) && TK_FISICA.length === 8, "TK_FISICA deve conter 8 skills");

for (const skill of TK_FISICA) {
  assert(
    typeof skill.desc === "string" && skill.desc.trim().length > 0,
    `Skill ${skill.id} (${skill.name}) sem campo desc preenchido`,
  );
}

const parent = { appendChild() {} };
const scene = new Scene();
const camera = new PerspectiveCamera(45, 1600 / 900, 0.1, 100);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();

const effectManager = new EffectManager(parent, scene);

const directions = [
  0,
  Math.PI / 2,
  Math.PI,
  -Math.PI / 2,
  Math.PI / 4,
];

function assertNoNan(rootObj) {
  rootObj.traverse((obj) => {
    assert(Number.isFinite(obj.position.x), `position.x é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.position.y), `position.y é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.position.z), `position.z é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.scale.x), `scale.x é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.scale.y), `scale.y é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.scale.z), `scale.z é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.rotation.x), `rotation.x é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.rotation.y), `rotation.y é NaN ou infinito em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.rotation.z), `rotation.z é NaN ou infinito em ${obj.name || obj.type}`);
  });
}

const activeSkills = TK_FISICA.filter((s) => s.kind !== "passive");
assert(activeSkills.length === 6, `Esperadas 6 skills ativas na física, encontrado ${activeSkills.length}`);

for (const skill of activeSkills) {
  const profile = getSkillVfxProfile(skill.id);
  assert(profile, `Perfil de VFX não encontrado para skill ${skill.id}`);

  for (const dir of directions) {
    effectManager.clearSkillVfx();

    const origin = new Vector3(0, 0, 0);
    const range = skill.range ?? 4;
    const target = new Vector3(Math.cos(dir) * range, 0, Math.sin(dir) * range);
    const center = skill.shape === "self" || skill.shape === "aoe" ? origin.clone() : target.clone();
    const hits = skill.shape === "line"
      ? [
          { id: "enemy-1", x: target.x * 0.4, z: target.z * 0.4, damage: 10, hitIndex: 0 },
          { id: "enemy-2", x: target.x * 0.9, z: target.z * 0.9, damage: 20, hitIndex: 1 },
        ]
      : skill.shape === "aoe"
      ? [
          { id: "enemy-1", x: center.x + 0.5, z: center.z + 0.5, damage: 30, hitIndex: 0 },
        ]
      : [
          { id: "enemy-1", x: target.x, z: target.z, damage: 15, hitIndex: 0 },
        ];

    effectManager.dispatchSkillVfx({
      profile,
      origin,
      target,
      center,
      colorHex: profile.colorHex,
      facing: dir,
      range,
      radius: profile.radius,
      hits,
      hasHeal: false,
      hasBuff: profile.family === "buff",
      hasTransform: false,
      hasSummon: false,
    });

    for (let frame = 0; frame < 12; frame++) {
      effectManager.update(1 / 60, camera, 1600, 900);
      assertNoNan(scene);
      const state = effectManager.getSkillVfxState();
      assert(Number.isFinite(state.active), `active não é finito em ${skill.id}`);
      assert(Number.isFinite(state.particles), `particles não é finito em ${skill.id}`);
    }

    effectManager.clearSkillVfx();
  }
}

effectManager.dispose();
console.log(`OK: check-tk-dispatch ${treeArg} completado com sucesso.`);
