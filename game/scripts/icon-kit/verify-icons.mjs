import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const gameDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = (() => { try { return createRequire(import.meta.url)("sharp"); } catch { const root = path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"); return createRequire(path.join(root, "sharp/package.json"))("sharp"); } })();
const read = (file) => JSON.parse(fs.readFileSync(path.join(gameDir, file), "utf8"));
const manifest = read("art/icon-kit/gallery-manifest.json");
const skillBriefs = read("art/icon-kit/skill-briefs.json");
const itemBriefs = read("art/icon-kit/item-briefs.json");
const interfaceIcons = read("public/assets/icons/interface-kit/manifest.json");
const sources = fs.readdirSync(path.join(gameDir, "art/icon-kit/sources")).filter((f) => f.endsWith(".json")).map((f) => read(path.join("art/icon-kit/sources", f)));
const sourceKeys = new Set(sources.map((s) => `${s.category}/${s.id}`));
if (sourceKeys.size !== sources.length) throw new Error("Duplicate item source IDs.");
if (skillBriefs.length !== 100 || new Set(skillBriefs.map((s) => s.id)).size !== 100 || skillBriefs.some((s) => !s.visual || /undefined|placeholder/i.test(s.visual))) throw new Error("Skill briefs are incomplete or contain generic placeholders.");
if (interfaceIcons.length !== 33 || new Set(interfaceIcons.map((i) => i.id)).size !== 33) throw new Error("Expected 33 unique interface icons.");
for (const icon of interfaceIcons) if (!fs.existsSync(path.join(gameDir, "public", icon.path.replace(/^\//, "")))) throw new Error(`Missing interface icon ${icon.id}.`);
const manifestKeys = new Set(manifest.map((m) => `${m.category}/${m.id}`));
if (manifestKeys.size !== manifest.length) throw new Error("Duplicate icon paths in gallery manifest.");
for (const source of sources) if (!manifestKeys.has(`${source.category}/${source.id}`)) throw new Error(`Source missing from gallery manifest: ${source.id}.`);
for (const brief of itemBriefs) if (!manifestKeys.has(`items/${brief.id}`) && !manifestKeys.has(`skills/${brief.id}`)) throw new Error(`Item brief missing from gallery manifest: ${brief.id}.`);
for (const icon of manifest) {
  if (!icon.path) throw new Error(`Missing output path for ${icon.id}.`);
  const base = path.join(gameDir, "public", icon.path.replace(/^\//, ""));
  for (const [suffix, size] of [["", 256], ["-128", 128], ["-64", 64]]) {
    const file = base.replace(/\.png$/, `${suffix}.png`);
    if (!fs.existsSync(file)) throw new Error(`Missing ${size}px PNG: ${icon.id}.`);
    const meta = await sharp(file).metadata();
    if (meta.width !== size || meta.height !== size || !meta.hasAlpha) throw new Error(`Invalid PNG metadata: ${icon.id} ${size}px.`);
  }
  if (!icon.alpha?.transparent || !icon.alpha?.visible) throw new Error(`Output alpha was not validated: ${icon.id}.`);
}
if (!fs.existsSync(path.join(gameDir, "art/icon-kit/review-ready.png"))) throw new Error("Missing 16-item review contact sheet.");
console.log(`Verified ${manifest.length} PNG icons, ${itemBriefs.length} item entries, ${skillBriefs.length} skill briefs, and ${interfaceIcons.length} interface SVGs.`);
