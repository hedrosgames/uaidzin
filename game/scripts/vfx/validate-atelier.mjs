import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { registerSkillComposition, getSkillComposition, validateSkillCompositions } from "../../vfx/lab/runtime-contract.js";

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const skills = JSON.parse(fs.readFileSync(path.join(game, "vfx/skills-manifest.json"), "utf8"));
const signatures = new Map();
let total = 0;
for (const version of [1, 2, 3]) {
  const filename = path.join(game, `vfx/lab/proposals-v${version}.js`);
  if (!fs.existsSync(filename) && !process.argv.includes("--complete")) continue;
  const entries = (await import(pathToFileURL(filename)))[`v${version}`];
  assert.equal(entries.length, 96);
  assert.equal(new Set(entries.map((p) => p.id)).size, 96);
  for (const entry of entries) {
    assert(skills.some((s) => s.id === entry.id), entry.id);
    assert(entry.title.length > 5 && entry.description.length > 50, entry.id);
    assert(entry.layers.length >= 2, entry.id);
    const previous = signatures.get(entry.id) ?? [];
    const signature = JSON.stringify(entry.layers);
    assert(!previous.includes(signature), `Receita repetida: ${entry.id}`);
    previous.push(signature);
    signatures.set(entry.id, previous);
    const factory = () => entry;
    registerSkillComposition(entry.id, `V${version}`, factory);
    assert.equal(getSkillComposition(entry.id, `V${version}`), factory);
  }
  assert.equal(validateSkillCompositions(skills.map((s) => s.id), `V${version}`).total, 96);
  total += entries.length;
}
assert.throws(() => validateSkillCompositions(["desconhecida"], "V1"));
assert.throws(() => registerSkillComposition("", "", null));
console.info(`Atelier: ${total} propostas; cobertura, dados autorais, receitas e registro válidos.`);
