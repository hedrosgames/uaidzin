import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { fileURLToPath } from "node:url";
const gameRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nonGameRoot = path.resolve(gameRoot, "../nongame/game");
const incoming = path.join(nonGameRoot, "assets-source/mixamo-incoming");
const organized = path.join(nonGameRoot, "assets-source/organized");
const discarded = path.join(nonGameRoot, "assets-source/_discarded");
const creaturePack = path.resolve(nonGameRoot, "../assets/drive/animations/mutant/creature-pack");
const humanOut = path.join(gameRoot, "public/models/anims/human");
const mutantOut = path.join(gameRoot, "public/models/anims/mutant");
const sharedOut = path.join(gameRoot, "public/models/player/shared/anims");

const DROP = [
  /turn/i,
  /strafe/i,
  /walk side/i,
  /side step/i,
  /^walking\.fbx$/i,
  /run forward/i,
  /mutant run \(1\)/i,
  /jump/i,
  /taunt/i,
  /flexing/i,
  /looking around/i,
  /great sword slash \(1\)/i,
  /punching \(1\)/i,
  /^running\.fbx$/i,
  /^mutant run\.fbx$/i,
  /^mutant punch\.fbx$/i,
  /^mutant roaring\.fbx$/i,
  /standing melee run jump attack/i,
  /standing melee attack downward/i,
  /standing melee combo attack ver\. 2/i,
];

const HUMAN_MAP = [
  ["Breathing Idle.fbx", null],
  ["Run With Sword.fbx", "run"],
  ["Sword And Shield Slash.fbx", "attack"],
  ["Magic Spell Casting.fbx", "cast"],
  ["Rib Hit.fbx", "hit_gut"],
  ["Standing React Small From Left.fbx", "hit_right"],
  ["2hand Idle.fbx", "idle_2h"],
  ["Great Sword Idle.fbx", "idle_greatsword"],
  ["Great Sword Slash.fbx", "attack_greatsword"],
  ["Heavy Weapon Swing.fbx", "attack_2h"],
  ["One Hand Sword Combo.fbx", "attack_1h"],
  ["Blocking.fbx", "block"],
  ["Fireball.fbx", "cast_fire"],
  ["Magic Heal.fbx", "cast_heal"],
  ["Standing Aim Recoil.fbx", "attack_bow"],
  ["Punching.fbx", "attack_unarmed"],
  ["Mutant Swiping.fbx", "attack_swipe"],
  ["Kicking.fbx", "attack_kick"],
];

const MUTANT_MAP = [
  ["mutant breathing idle.fbx", "idle"],
  ["mutant run.fbx", "run"],
  ["mutant swiping.fbx", "attack"],
  ["mutant punch.fbx", "attack_punch"],
  ["mutant dying.fbx", "death"],
  ["mutant roaring.fbx", "roar"],
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function moveToDiscarded(filePath, reason) {
  ensureDir(discarded);
  const base = path.basename(filePath);
  const dest = path.join(discarded, base);
  if (fs.existsSync(filePath)) fs.renameSync(filePath, dest);
  fs.appendFileSync(path.join(discarded, "_log.txt"), `${base}\t${reason}\n`);
}

function shouldDrop(name) {
  return DROP.some((re) => re.test(name));
}

function blender(script, args) {
  const res = spawnSync(
    "blender",
    ["-b", "-P", path.join(gameRoot, "scripts", script), "--", ...args],
    { stdio: "inherit", cwd: gameRoot },
  );
  if (res.status !== 0) throw new Error(`blender failed: ${script}`);
}

ensureDir(path.join(organized, "human"));
ensureDir(path.join(organized, "mutant"));
ensureDir(humanOut);
ensureDir(mutantOut);

for (const name of fs.readdirSync(incoming)) {
  if (!name.toLowerCase().endsWith(".fbx")) continue;
  const src = path.join(incoming, name);
  if (shouldDrop(name)) {
    moveToDiscarded(src, "drop rule");
    continue;
  }
  const dest = path.join(organized, "human", name);
  fs.copyFileSync(src, dest);
}

for (const [file, clip] of HUMAN_MAP) {
  const src = path.join(organized, "human", file);
  if (!fs.existsSync(src)) {
    console.warn("missing human", file);
    continue;
  }
  if (clip === null) continue;
  const out = path.join(humanOut, `${clip}.glb`);
  blender("mixamo-export-anim.py", [src, out, clip]);
  const shared = path.join(sharedOut, `${clip}.glb`);
  if (["run", "attack", "cast", "hit_gut", "hit_right", "death"].includes(clip)) {
    fs.copyFileSync(out, shared);
  }
}

const tkBase = path.join(gameRoot, "public/models/player/TK/TK.glb");
const idleSrc = path.join(organized, "human", "Breathing Idle.fbx");
const tkOut = path.join(gameRoot, "public/models/player/TK/TK.glb");
if (fs.existsSync(tkBase) && fs.existsSync(idleSrc)) {
  const tmp = path.join(gameRoot, "public/models/player/TK/TK.next.glb");
  blender("mixamo-retarget-idle.py", [tkBase, idleSrc, tmp]);
  fs.renameSync(tmp, tkOut);
}

for (const [file, clip] of MUTANT_MAP) {
  const src = path.join(creaturePack, file);
  if (!fs.existsSync(src)) {
    console.warn("missing mutant", file);
    continue;
  }
  const destOrg = path.join(organized, "mutant", file);
  fs.copyFileSync(src, destOrg);
  const out = path.join(mutantOut, `${clip}.glb`);
  blender("mixamo-export-anim.py", [src, out, clip]);
}

const meshZips = [
  ["werewolf+warrior+3d+model.zip", "lobo"],
  ["bear+warrior+3d+model.zip", "urso"],
  ["stone+golem+3d+model.zip", "tita"],
];
for (const [zip, folder] of meshZips) {
  const zpath = path.join(incoming, zip);
  if (!fs.existsSync(zpath)) continue;
  const dest = path.join(organized, "meshes", folder);
  ensureDir(dest);
  spawnSync("unzip", ["-q", "-o", zpath, "-d", dest], { stdio: "inherit" });
}

const manifest = {
  human: fs.readdirSync(humanOut).filter((f) => f.endsWith(".glb")),
  mutant: fs.readdirSync(mutantOut).filter((f) => f.endsWith(".glb")),
  shared: fs.readdirSync(sharedOut).filter((f) => f.endsWith(".glb")),
};
fs.writeFileSync(path.join(organized, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("done", manifest);
