import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const gameDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcesDir = path.join(gameDir, "art/icon-kit/sources");
const sheetsDir = path.join(gameDir, "art/icon-kit/sheets");
const outputDir = path.join(gameDir, "public/assets/icons");
function loadSharp() {
  try { return createRequire(import.meta.url)("sharp"); } catch {}
  const bundledRoot = path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules");
  return createRequire(path.join(bundledRoot, "sharp/package.json"))("sharp");
}
const sharp = loadSharp();
async function prepare(source, crop, size) {
  if (crop) {
    const meta = await sharp(source).metadata();
    const { left, top, width, height } = crop;
    if (![left, top, width, height].every(Number.isInteger) || left < 0 || top < 0 || width < 1 || height < 1 || left + width > meta.width || top + height > meta.height) throw new Error("Invalid sheet crop rectangle");
  }
  const extracted = crop
    ? await sharp(source).ensureAlpha().extract(crop).png().toBuffer()
    : await sharp(source).ensureAlpha().png().toBuffer();
  const bounds = await sharp(extracted).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer({ resolveWithObject: true });
  if (!bounds.info.width || !bounds.info.height) throw new Error("PNG has no visible pixels");
  const padding = Math.ceil(size * .08);
  const inner = await sharp(bounds.data).resize(size - padding * 2, size - padding * 2, { fit: "contain", kernel: sharp.kernel.lanczos3, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const square = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: inner, left: padding, top: padding }]).png({ compressionLevel: 9 }).toBuffer();
  const { data, info } = await sharp(square).raw().toBuffer({ resolveWithObject: true });
  let transparent = 0, visible = 0;
  for (let i = 3; i < data.length; i += info.channels) { if (data[i] === 0) transparent++; else visible++; }
  if (transparent === 0 || visible === 0) throw new Error("Output must contain both transparent and visible pixels");
  return { png: square, alpha: { transparent, visible } };
}
if (process.argv[2] === "--inspect-sheet") {
  const imagePath = path.resolve(process.argv[3]);
  const image = sharp(imagePath).ensureAlpha();
  const { width, height } = await image.metadata();
  const cols = Number(process.argv[4] || 4), rows = Number(process.argv[5] || 4);
  const cells = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const left = Math.round(col * width / cols), top = Math.round(row * height / rows);
    const right = Math.round((col + 1) * width / cols), bottom = Math.round((row + 1) * height / rows);
    const cell = await sharp(imagePath).extract({ left, top, width: right - left, height: bottom - top }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const counts = { alphaGt0: 0, alphaGt16: 0, alphaGte128: 0, maxAlpha: 0 }, bounds = { 1: [cell.info.width, cell.info.height, -1, -1], 17: [cell.info.width, cell.info.height, -1, -1], 128: [cell.info.width, cell.info.height, -1, -1] };
    for (let y = 0; y < cell.info.height; y++) for (let x = 0; x < cell.info.width; x++) { const alpha = cell.data[(y * cell.info.width + x) * 4 + 3]; counts.maxAlpha = Math.max(counts.maxAlpha, alpha); for (const [threshold, key] of [[1, "alphaGt0"], [17, "alphaGt16"], [128, "alphaGte128"]]) if (alpha >= threshold) { counts[key]++; const b = bounds[threshold]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } }
    const box = (b) => b[2] < 0 ? null : { x: b[0], y: b[1], width: b[2] - b[0] + 1, height: b[3] - b[1] + 1 };
    const edge = (b) => b[2] >= 0 && (b[0] === 0 || b[1] === 0 || b[2] === cell.info.width - 1 || b[3] === cell.info.height - 1);
    cells.push({ row: row + 1, col: col + 1, crop: { left, top, width: right - left, height: bottom - top }, ...counts, occupancyGt16: Number((counts.alphaGt16 / (cell.info.width * cell.info.height)).toFixed(4)), bboxAlphaGt0: box(bounds[1]), bboxAlphaGt16: box(bounds[17]), bboxAlphaGte128: box(bounds[128]), edgeAlphaGt0: edge(bounds[1]), edgeAlphaGt16: edge(bounds[17]), edgeAlphaGte128: edge(bounds[128]) });
  }
  console.log(JSON.stringify({ width, height, cols, rows, cells }, null, 2));
  process.exit(0);
}
if (process.argv[2] === "--render-sheet") {
  const input = path.resolve(process.argv[3]), output = path.resolve(process.argv[4]);
  const cols = Number(process.argv[5] || 3), rows = Number(process.argv[6] || 3);
  const { width, height } = await sharp(input).metadata();
  const panelW = 240, panelH = 154, pieces = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const left = Math.round(col * width / cols), top = Math.round(row * height / rows), right = Math.round((col + 1) * width / cols), bottom = Math.round((row + 1) * height / rows);
    const cell = await sharp(input).extract({ left, top, width: right - left, height: bottom - top }).ensureAlpha().png().toBuffer();
    const icon64 = await sharp(cell).resize(64, 64, { fit: "contain", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const icon128 = await sharp(cell).resize(128, 128, { fit: "contain", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${panelW}" height="${panelH}"><defs><pattern id="c" width="16" height="16" patternUnits="userSpaceOnUse"><path fill="#222" d="M0 0h8v8H0zm8 8h8v8H8z"/><path fill="#333" d="M8 0h8v8H8zM0 8h8v8H0z"/></pattern></defs><rect width="100%" height="100%" fill="#241c14"/><rect x="8" y="27" width="76" height="118" fill="url(#c)"/><rect x="92" y="27" width="140" height="118" fill="url(#c)"/><text x="12" y="19" fill="#f0e6d0" font-family="sans-serif" font-size="12">R${row + 1} C${col + 1} · 64px</text><text x="96" y="19" fill="#f0e6d0" font-family="sans-serif" font-size="12">128px</text></svg>`;
    const panel = await sharp(Buffer.from(svg)).composite([{ input: icon64, left: 14, top: 52 }, { input: icon128, left: 98, top: 32 }]).png().toBuffer();
    pieces.push({ input: panel, left: col * panelW, top: row * panelH });
  }
  await sharp({ create: { width: cols * panelW, height: rows * panelH, channels: 4, background: { r: 16, g: 12, b: 8, alpha: 1 } } }).composite(pieces).png({ compressionLevel: 9 }).toFile(output);
  console.log(`Wrote ${output}`);
  process.exit(0);
}
if (process.argv[2] === "--render-contact") {
  const manifestPath = path.resolve(process.argv[3]), outputPath = path.resolve(process.argv[4]);
  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf8")).filter((e) => e.status === "generated");
  const cols = 4, panelW = 260, panelH = 170, rows = Math.ceil(entries.length / cols), panels = [];
  for (let index = 0; index < entries.length; index++) {
    const item = entries[index];
    const base = path.join(gameDir, "public", item.path.replace(/^\//, ""));
    const small = await sharp(base.replace(/\.png$/, "-64.png")).png().toBuffer();
    const large = await sharp(base.replace(/\.png$/, "-128.png")).png().toBuffer();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${panelW}" height="${panelH}"><defs><pattern id="c" width="16" height="16" patternUnits="userSpaceOnUse"><path fill="#222" d="M0 0h8v8H0zm8 8h8v8H8z"/><path fill="#333" d="M8 0h8v8H8zM0 8h8v8H0z"/></pattern></defs><rect width="100%" height="100%" fill="#100c08"/><rect x="8" y="28" width="78" height="132" fill="url(#c)"/><rect x="94" y="28" width="158" height="132" fill="url(#c)"/><text x="11" y="19" fill="#d4a017" font-family="sans-serif" font-size="12">${item.id} · 64px / 128px</text></svg>`;
    const panel = await sharp(Buffer.from(svg)).composite([{ input: small, left: 15, top: 61 }, { input: large, left: 109, top: 33 }]).png().toBuffer();
    panels.push({ input: panel, left: index % cols * panelW, top: Math.floor(index / cols) * panelH });
  }
  await sharp({ create: { width: cols * panelW, height: rows * panelH, channels: 4, background: { r: 16, g: 12, b: 8, alpha: 1 } } }).composite(panels).png({ compressionLevel: 9 }).toFile(outputPath);
  console.log(`Wrote ${entries.length} items to ${outputPath}`);
  process.exit(0);
}
fs.mkdirSync(outputDir, { recursive: true });
const records = fs.existsSync(sourcesDir) ? fs.readdirSync(sourcesDir).filter((f) => f.endsWith(".json")).map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(sourcesDir, f), "utf8")), quality: "final" })) : [];
for (const file of fs.existsSync(sheetsDir) ? fs.readdirSync(sheetsDir).filter((f) => f.endsWith(".json")) : []) {
  const sheet = JSON.parse(fs.readFileSync(path.join(sheetsDir, file), "utf8"));
  const name = path.basename(file, ".json");
  const category = name.toLowerCase().includes("skill") || ["TK", "FM", "BM", "HT"].some((c) => name.toUpperCase().includes(c)) ? "skills" : "items";
  const external = path.resolve(sheet.source);
  const metadata = await sharp(external).metadata();
  const cellCount = sheet.columns * sheet.rows;
  if (!Number.isInteger(cellCount) || cellCount < sheet.items.length) throw new Error(`Sheet ${file} has fewer cells than mapped items.`);
  sheet.items.forEach((item, index) => {
    const id = typeof item === "string" ? item : item.id;
    if (!id) throw new Error(`Missing item id at ${file} cell ${index + 1}.`);
    const itemCategory = item.category === "skills" || item.category === "items" ? item.category : category;
    const col = index % sheet.columns;
    const row = Math.floor(index / sheet.columns);
    const left = Math.floor((col * metadata.width) / sheet.columns);
    const top = Math.floor((row * metadata.height) / sheet.rows);
    const right = Math.min(metadata.width, Math.floor(((col + 1) * metadata.width) / sheet.columns));
    const bottom = Math.min(metadata.height, Math.floor(((row + 1) * metadata.height) / sheet.rows));
    records.push({ id, name: item.name || id, category: itemCategory, source: sheet.source, crop: { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }, quality: "placeholder", group: item.group || name });
  });
}
for (const [skillId, bookId] of [["book_hp", "book_01"], ["book_gold", "book_02"], ["book_xp", "book_03"], ["book_cd", "book_04"]]) {
  const book = records.find((r) => r.id === bookId && r.category === "items");
  if (book) records.push({ ...book, id: skillId, category: "skills", quality: "placeholder", group: "book-skill" });
}
const finals = new Set(records.filter((r) => r.quality === "final").map((r) => `${r.category}/${r.id}`));
const deduped = records.filter((r) => r.quality === "final" || !finals.has(`${r.category}/${r.id}`));
if (new Set(deduped.map((r) => `${r.category}/${r.id}`)).size !== deduped.length) throw new Error("Duplicate category/id in icon sources and sheets.");
const results = [];
for (const item of deduped) {
  const externalSource = path.resolve(item.source);
  const originalsDir = path.join(gameDir, "art/icon-kit/originals/generated");
  const workspaceSource = path.join(originalsDir, path.basename(externalSource));
  if (fs.existsSync(externalSource)) { fs.mkdirSync(originalsDir, { recursive: true }); if (!fs.existsSync(workspaceSource)) fs.copyFileSync(externalSource, workspaceSource); }
  const source = fs.existsSync(workspaceSource) ? workspaceSource : externalSource;
  try {
    const resultsBySize = {};
    for (const size of [256, 128, 64]) resultsBySize[size] = await prepare(source, item.crop, size);
    const targetDir = path.join(outputDir, item.category);
    fs.mkdirSync(targetDir, { recursive: true });
    for (const size of [256, 128, 64]) fs.writeFileSync(path.join(targetDir, `${item.id}${size === 256 ? "" : `-${size}`}.png`), resultsBySize[size].png);
    const placeholder = item.quality === "placeholder";
    results.push({ id: item.id, category: item.category, name: item.name, path: `/assets/icons/${item.category}/${item.id}.png`, preview64: `/assets/icons/${item.category}/${item.id}-64.png`, preview128: `/assets/icons/${item.category}/${item.id}-128.png`, status: placeholder ? "placeholder" : "generated", reviewStatus: placeholder ? "placeholder" : "needs-visual-review", source: workspaceSource, crop: item.crop || null, group: item.group || null, alpha: resultsBySize[256].alpha });
  } catch (error) { results.push({ id: item.id, category: item.category, name: item.name, path: null, status: "pending", reason: String(error.message || error) }); }
}
fs.writeFileSync(path.join(gameDir, "art/icon-kit/gallery-manifest.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(`Optimized ${results.filter((r) => r.status === "generated" || r.status === "placeholder").length}/${deduped.length}; pending ${results.filter((r) => r.status === "pending").length}.`);
