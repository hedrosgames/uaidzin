import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specs = [
  "golpe", "investida", "corte", "machado", "quebra", "furia", "avalanche",
  "bencao", "selo", "aura", "escudo-sagrado", "julgamento", "luz", "purificar", "tribunal",
  "provocacao", "postura", "rugido", "muralha", "ancora", "desafio", "guarda", "bastiao",
].map(slug => ({
  slug,
  className: slug.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(""),
}));
const requested = process.argv.slice(2);
assert(requested.every(slug => specs.some(spec => spec.slug === slug)), "Controller sem adaptador de simulação.");
const selected = specs.filter(spec => requested.length === 0 || requested.includes(spec.slug));
const imports = selected.map(spec => {
  spec.modulePath = `/src/presentation/effects/tkSkills/${spec.slug}/${spec.className}Vfx.ts`;
  return `export * as ${spec.className} from ${JSON.stringify(path.join(root, spec.modulePath.slice(1)))};`;
});
const compiled = await build({
  stdin: {
    contents: `export * as THREE from "three";\n${imports.join("\n")}`,
    resolveDir: root,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const modules = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);

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

globalThis.document = {
  createElement(name) {
    assert.equal(name, "canvas");
    return createCanvas();
  },
};

async function createLabAdapter(spec, controller, scene) {
  const demo = await fs.readFile(path.join(root, "src/presentation/effects/tkSkills", spec.slug, "demo.ts"), "utf8");
  const ast = ts.createSourceFile("demo.ts", demo, ts.ScriptTarget.ES2022, true);
  const declarations = ast.statements.filter(ts.isVariableStatement)
    .flatMap(statement => statement.declarationList.declarations);
  const initializer = declarations.find(declaration => declaration.name.getText(ast) === "api")?.initializer;
  assert(initializer && ts.isObjectLiteralExpression(initializer), `API ausente: ${spec.slug}`);
  const apiSource = initializer.getText(ast);
  const targetName = apiSource.match(/target:\s*(\w+)\.toArray\(\)/)?.[1];
  assert(targetName, `Alvo ausente: ${spec.slug}`);
  const castProperty = initializer.properties.find(property => property.name?.getText(ast) === "cast");
  const castName = castProperty.initializer.getText(ast).match(/\bcast\w+/)[0];
  const castFunction = ast.statements.find(statement =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === castName);
  assert(castFunction, `Função de cast ausente: ${spec.slug}`);
  const vectorNames = ["origin", "playerOrigin", targetName];
  const vectors = declarations.filter(declaration => vectorNames.includes(declaration.name.getText(ast)));
  const adapter = `
    let disposed = false;
    let simulationPaused = true;
    let speed = 1;
    let nextLoopCast = 0;
    const stage = { clientWidth: 1600, clientHeight: 900 };
    const composer = { render() {} };
    const updateHud = () => {};
    const setPaused = value => { simulationPaused = value; };
    const dispose = () => { disposed = true; vfx.dispose(); };
    ${vectors.map(declaration => `const ${declaration.getText(ast)};`).join("\n")}
    ${castFunction.getText(ast)}
    const setTarget = (...coordinates) => {
      if (disposed || !coordinates.every(Number.isFinite)) return false;
      vfx.clear();
      ${targetName}.set(...coordinates);
      return true;
    };
    return ${apiSource};
  `;
  const compiledAdapter = ts.transpileModule(adapter, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const camera = new modules.THREE.PerspectiveCamera();
  const renderer = { info: { memory: {} } };
  return new Function("vfx", "scene", "camera", "renderer", "Vector3", compiledAdapter)(
    controller, scene, camera, renderer, modules.THREE.Vector3,
  );
}

const reports = [];
for (const spec of selected) {
  const source = await fs.readFile(path.join(root, `scripts/check-tk-${spec.slug}.mjs`), "utf8");
  const match = source.match(/await evaluate\(`(window\.(__[A-Z_]+_QA__) = [\s\S]+?); true`\);/);
  assert(match, `Eval de QA ausente: ${spec.slug}`);
  const targets = JSON.parse(source.match(/const targets = (\[[\s\S]+?\]);/)[1]);
  const scene = new modules.THREE.Scene();
  const Controller = modules[spec.className][`${spec.className}VfxController`];
  const controller = new Controller(scene);
  const api = await createLabAdapter(spec, controller, scene);
  const key = spec.slug.toUpperCase().replaceAll("-", "_");
  const window = { [`__UAIDZIN_TK_${key}__`]: api };
  const skipped = [];
  const code = match[1]
    .replaceAll(/await import\('([^']+)'\)/g, (_match, specifier) => {
      assert.equal(specifier, spec.modulePath);
      return `modules[${JSON.stringify(spec.className)}]`;
    })
    .replace(
      "const ok = (value, message) => {",
      "const ok = (value, message) => { if (message.startsWith('Memória')) { skipped.push(message); return; }",
    );
  new Function("window", "modules", "skipped", code)(window, modules, skipped);
  try {
    const result = await window[match[2]](targets, 12, true);
    reports.push({
      skill: spec.slug,
      passed: true,
      checks: result.checks.length,
      directions: (result.directions ?? result.samples).length,
      skipped,
    });
    process.stdout.write(`${spec.slug}: ${result.checks.length} verificações de simulação OK\n`);
  } catch (error) {
    reports.push({ skill: spec.slug, passed: false, error: error.message });
    process.stdout.write(`${spec.slug}: FALHOU: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    controller.dispose();
  }
}
process.stdout.write(`${JSON.stringify({
  simulationOnly: true,
  notValidated: ["renderização das texturas", "WebGL/shaders", "memória do renderer", "controles e reprodução no navegador"],
  reports,
}, null, 2)}\n`);
