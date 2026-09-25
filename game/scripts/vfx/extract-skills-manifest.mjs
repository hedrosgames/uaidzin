import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const gameDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const result = await build({
  entryPoints: [path.join(gameDir, "src/data/classes/class-definitions.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { CLASSES } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const skills = ["TK", "FM", "BM", "HT"].flatMap((classId) => {
  const def = CLASSES[classId];
  return def.treeOrder.flatMap((tree) => def.trees[tree].map((skill, index) => ({
    ...skill, classId, className: def.name, tree, treeLabel: def.treeLabels[tree], tier: index + 1,
  })));
});
if (skills.length !== 96 || new Set(skills.map((s) => s.id)).size !== 96) {
  throw new Error("Esperadas exatamente 96 skills únicas.");
}
const output = `${JSON.stringify(skills, null, 2)}\n`;
const filename = path.join(gameDir, "vfx/skills-manifest.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(filename, "utf8") !== output) throw new Error("Manifest desatualizado: execute npm run vfx:manifest.");
} else {
  fs.writeFileSync(filename, output);
}
