import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TREES = ["fisica", "controle", "magia"];
const requested = process.argv.slice(2);
assert(requested.every(tree => TREES.includes(tree)), `Árvore desconhecida. Use: ${TREES.join(", ")}`);
const trees = requested.length ? requested : ["controle", "magia"];

const compiled = await build({
  stdin: {
    contents: [
      `export * as THREE from "three";`,
      `export { EffectManager } from ${JSON.stringify(path.join(root, "src/presentation/effects/EffectManager.ts"))};`,
      `export { getSkillVfxProfile } from ${JSON.stringify(path.join(root, "src/presentation/effects/skill/SkillVfxCatalog.ts"))};`,
      `export { CLASSES } from ${JSON.stringify(path.join(root, "src/data/classes/class-definitions.ts"))};`,
    ].join("\n"),
    resolveDir: root,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});

function createCanvas() {
  const canvas = { width: 1, height: 1 };
  const gradient = () => ({ addColorStop() {} });
  const imageData = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
  const context = {
    canvas,
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createImageData: imageData,
    getImageData: (_x, _y, width, height) => imageData(width, height),
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

function createElement() {
  const children = [];
  return {
    id: "",
    className: "",
    textContent: "",
    style: {},
    children,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    appendChild(child) { children.push(child); return child; },
    removeChild(child) { children.splice(children.indexOf(child), 1); return child; },
    remove() {},
    querySelector() { return null; },
  };
}

globalThis.document = {
  createElement(name) {
    return name === "canvas" ? createCanvas() : createElement();
  },
};

const modules = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
const { THREE, EffectManager, getSkillVfxProfile, CLASSES } = modules;

const controllerField = slug => `tk${slug.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join("")}`;

function buildRequest(profile, facing) {
  const skill = profile.skill;
  const origin = new THREE.Vector3(0, 0, 0);
  const aim = new THREE.Vector3(Math.sin(facing) * 3, 0, Math.cos(facing) * 3);
  const target = skill.shape === "self" || skill.kind === "passive" ? null : aim;
  const center = skill.shape === "aoe" || !target ? origin : target;
  return {
    profile,
    origin,
    target,
    center,
    colorHex: profile.colorHex,
    facing,
    range: skill.range,
    radius: skill.radius ?? (skill.shape === "aoe" ? skill.range : 0),
    hits: target ? [{ id: "qa", x: aim.x, z: aim.z, damage: 1, hitIndex: 0 }] : [],
    hasHeal: false,
    hasBuff: skill.kind === "buff",
    hasTransform: false,
    hasSummon: false,
  };
}

function assertFiniteScene(scene, label) {
  scene.traverse(object => {
    const values = [...object.position.toArray(), ...object.scale.toArray(), ...object.rotation.toArray().slice(0, 3)];
    assert(values.every(Number.isFinite), `${label}: transform não finito em ${object.type}`);
  });
}

const camera = new THREE.PerspectiveCamera();
const reports = [];
for (const tree of trees) {
  const skills = CLASSES.TK.trees[tree];
  for (const skill of skills) {
    const profile = getSkillVfxProfile(skill.id);
    const report = { tree, id: skill.id, name: skill.name, kind: skill.kind, dedicated: profile?.dedicatedVfx ?? null, checks: 0 };
    reports.push(report);
    try {
      assert(profile, "perfil de VFX ausente");
      assert(typeof skill.desc === "string" && skill.desc.length > 0, "desc ausente");
      report.checks += 2;
      if (skill.kind === "passive" && !profile.dedicatedVfx) continue;
      const field = profile.dedicatedVfx ? controllerField(profile.dedicatedVfx) : "skillVfx";
      for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7]) {
        const scene = new THREE.Scene();
        const effects = new EffectManager(createElement(), scene);
        try {
          effects.dispatchSkillVfx(buildRequest(profile, facing));
          assert.equal(effects[field].getActiveCastCount(), 1, `${field} não iniciou cast (facing ${facing.toFixed(2)})`);
          if (field !== "skillVfx") assert.equal(effects.skillVfx.getActiveCastCount(), 0, "diretor genérico disparou junto do dedicado");
          for (let frame = 0; frame < 30; frame += 1) effects.update(1 / 60, camera, 1600, 900);
          assertFiniteScene(scene, `${skill.id} facing ${facing.toFixed(2)}`);
          report.checks += 3;
        } finally {
          effects.dispose();
        }
      }
      process.stdout.write(`${skill.id} -> ${profile.dedicatedVfx ?? `genérico ${profile.family}`}: ${report.checks} verificações OK\n`);
    } catch (error) {
      report.error = error.message;
      process.exitCode = 1;
      process.stdout.write(`${skill.id}: FALHOU: ${error.message}\n`);
    }
  }
}
process.stdout.write(`${JSON.stringify({
  simulationOnly: true,
  notValidated: ["renderização", "WebGL/shaders", "cast pela sessão/barra no navegador"],
  reports,
}, null, 2)}\n`);
