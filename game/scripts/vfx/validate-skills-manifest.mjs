import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestFile = path.resolve(scriptDir, "../../vfx/skills-manifest.json");
const skills = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const classOrder = ["TK", "FM", "BM", "HT"];
const treeOrder = {
  TK: ["fisica", "controle", "magia"],
  FM: ["fisica", "controle", "magia"],
  BM: ["fisica", "magia", "controle"],
  HT: ["fisica", "controle", "magia"],
};
const requiredFields = [
  "id",
  "name",
  "classId",
  "className",
  "tree",
  "treeLabel",
  "tier",
  "kind",
  "shape",
  "power",
  "damageMultiplier",
  "range",
  "cooldown",
  "mp",
];

if (skills.length !== 96 || new Set(skills.map((skill) => skill.id)).size !== 96) {
  throw new Error(`Manifest must contain 96 unique ids, got ${skills.length}`);
}
for (const classId of classOrder) {
  const classSkills = skills.filter((skill) => skill.classId === classId);
  if (classSkills.length !== 24) throw new Error(`${classId} must contain 24 skills`);
  for (const tree of treeOrder[classId]) {
    const treeSkills = classSkills.filter((skill) => skill.tree === tree);
    if (treeSkills.length !== 8) throw new Error(`${classId}/${tree} must contain 8 skills`);
    if (treeSkills.some((skill, index) => skill.tier !== index + 1)) {
      throw new Error(`${classId}/${tree} tiers must be ordered from 1 to 8`);
    }
  }
}
for (const skill of skills) {
  for (const field of requiredFields) {
    if (!(field in skill)) throw new Error(`${skill.id} is missing ${field}`);
  }
}
