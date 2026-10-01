import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const treeArg = process.argv[2] || "all";
const validTrees = new Set(["all", "fisica", "controle", "magia"]);
assert(validTrees.has(treeArg), `Árvore não suportada: ${treeArg}`);

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
    "transform", "clip",
  ]) context[name] = () => {};
  canvas.getContext = () => context;
  return canvas;
}

globalThis.Path2D = class {};
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
      export { TK_FISICA, TK_CONTROLE, TK_MAGIA } from "./src/data/classes/skills/tk";
      export { getSkillVfxProfile, TK_DEDICATED_VFX_BY_SKILL_ID } from "./src/presentation/effects/skill/SkillVfxCatalog";
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

const {
  EffectManager,
  TK_FISICA,
  TK_CONTROLE,
  TK_MAGIA,
  getSkillVfxProfile,
  TK_DEDICATED_VFX_BY_SKILL_ID,
  Scene,
  PerspectiveCamera,
  Vector3,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);

const trees = {
  fisica: TK_FISICA,
  controle: TK_CONTROLE,
  magia: TK_MAGIA,
};

for (const [tree, skills] of Object.entries(trees)) {
  assert(Array.isArray(skills) && skills.length === 8, `TK ${tree} deve conter 8 skills`);
}

const selectedTrees = treeArg === "all"
  ? Object.values(trees)
  : [trees[treeArg]];
const selectedSkills = selectedTrees.flat();
const activeSkills = selectedSkills.filter((skill) => skill.kind !== "passive");
const selectedIds = new Set(selectedSkills.map((skill) => skill.id));
assert.equal(selectedIds.size, selectedSkills.length, "IDs duplicados nas skills TK selecionadas");

for (const skill of activeSkills) {
  const profile = getSkillVfxProfile(skill.id);
  assert(profile, `Perfil de VFX não encontrado para ${skill.id}`);
  assert(
    profile.family === "chain" || typeof profile.dedicatedVfx === "string",
    `Skill ativa ${skill.id} caiu no VFX genérico`,
  );
}

for (const id of Object.keys(TK_DEDICATED_VFX_BY_SKILL_ID)) {
  assert(
    [...Object.values(trees).flat()].some((skill) => skill.id === id),
    `Mapping de VFX TK aponta para ID inexistente: ${id}`,
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
const directions = [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4];

function assertNoNan(rootObj) {
  rootObj.traverse((obj) => {
    assert(Number.isFinite(obj.position.x), `position.x inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.position.y), `position.y inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.position.z), `position.z inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.scale.x), `scale.x inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.scale.y), `scale.y inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.scale.z), `scale.z inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.rotation.x), `rotation.x inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.rotation.y), `rotation.y inválido em ${obj.name || obj.type}`);
    assert(Number.isFinite(obj.rotation.z), `rotation.z inválido em ${obj.name || obj.type}`);
  });
}

const selectedSkill = process.argv[3];
assert(!selectedSkill || activeSkills.some(skill => skill.id === selectedSkill), `Skill ativa desconhecida: ${selectedSkill}`);

for (const skill of activeSkills.filter(skill => !selectedSkill || skill.id === selectedSkill)) {
  const profile = getSkillVfxProfile(skill.id);
  for (const dir of directions) {
    effectManager.clearSkillVfx();
    const origin = new Vector3(0, 0, 0);
    const range = skill.range ?? 4;
    const target = skill.shape === "self"
      ? origin.clone()
      : new Vector3(Math.sin(dir) * range, 0, Math.cos(dir) * range);
    const center = skill.shape === "self" || skill.shape === "aoe"
      ? origin.clone()
      : target.clone();
    const hits = skill.shape === "aoe"
      ? [{ id: "enemy-1", x: center.x + 0.5, z: center.z + 0.5, damage: 30, hitIndex: 0 }]
      : skill.kind === "damage"
        ? [{ id: "enemy-1", x: target.x, z: target.z, damage: 15, hitIndex: 0 }]
        : [];

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
      hasHeal: skill.kind === "heal",
      hasBuff: skill.kind === "buff",
      hasTransform: false,
      hasSummon: false,
    });

    for (let frame = 0; frame < 12; frame += 1) {
      effectManager.update(1 / 60, camera, 1600, 900);
      assertNoNan(scene);
      const state = effectManager.getSkillVfxState();
      assert(Number.isFinite(state.active), `active inválido em ${skill.id}`);
      assert(Number.isFinite(state.particles), `particles inválido em ${skill.id}`);
    }
  }
}

effectManager.clearSkillVfx();
assert.equal(effectManager.getSkillVfxState().active, 0, "VFX ativos após clear");
effectManager.dispose();
console.log(`OK: check-tk-dispatch ${treeArg}${selectedSkill ? ` ${selectedSkill}` : ""} validou ${selectedSkill ? 1 : activeSkills.length} skills ativas.`);
