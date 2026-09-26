import monstersData from "../../data/monsters/monsters.json";
import {
  WEAPON_SET_IDS,
  WEAPON_SET_LABEL,
  type WeaponSetId,
} from "../../presentation/player/WeaponRig";

export type PlayerClassId = "TK" | "FM" | "BM" | "HT";

export interface ClassDef {
  id: PlayerClassId;
  label: string;
  modelUrl: string;
}

export interface ClipDef {
  id: string;
  label: string;
  url: string;
}

export interface ClipSetDef {
  id: string;
  label: string;
  clips: ClipDef[];
}

export interface MonsterEntry {
  id: string;
  name: string;
  archetypeLabel: string;
  isBoss: boolean;
  modelUrl: string;
  expectedUrl: string;
}

export interface WeaponSetDef {
  id: WeaponSetId;
  label: string;
}

export interface LabCatalog {
  classes: ClassDef[];
  humanClips: ClipDef[];
  monsterClips: ClipSetDef | null;
  monsters: MonsterEntry[];
  weaponSets: WeaponSetDef[];
}

export const IDLE_CLIP_ID = "idle";

const CLASS_DEFS: ClassDef[] = [
  { id: "TK", label: "Thegn Knight", modelUrl: "/models/player/TK/TK.glb" },
  { id: "FM", label: "Frost Maiden", modelUrl: "/models/player/FM/FM.glb" },
  { id: "BM", label: "Beast Master", modelUrl: "/models/player/BM/BM.glb" },
  { id: "HT", label: "Huntress", modelUrl: "/models/player/HT/HT.glb" },
];

export const CLASS_WEAPON_SET: Record<PlayerClassId, WeaponSetId> = {
  TK: "axe-shield",
  FM: "greatstaff",
  BM: "dual-gloves",
  HT: "dual-sword",
};

const HUMAN_ANIM_ROOT = "/models/anims/human";
const SHARED_ANIM_ROOT = "/models/player/shared/anims";
const MONSTER_ANIM_ROOT = "/models/anims/mutant";
const SHARED_CLIP_IDS = new Set(["death"]);

const HUMAN_CLIP_ORDER: Array<[string, string]> = [
  ["run", "Corrida"],
  ["attack", "Ataque"],
  ["attack_1h", "Ataque 1 mão"],
  ["attack_2h", "Ataque 2 mãos"],
  ["attack_bow", "Ataque arco"],
  ["attack_greatsword", "Ataque espadão"],
  ["attack_unarmed", "Ataque sem arma"],
  ["attack_swipe", "Golpe varrido"],
  ["attack_kick", "Chute"],
  ["block", "Bloqueio"],
  ["cast", "Conjuração"],
  ["cast_fire", "Magia de fogo"],
  ["cast_heal", "Cura"],
  ["hit_gut", "Dano no tronco"],
  ["hit_right", "Dano à direita"],
  ["death", "Morte"],
  ["idle_2h", "Idle 2 mãos"],
  ["idle_greatsword", "Idle espadão"],
];

const MONSTER_CLIP_ORDER: Array<[string, string]> = [
  ["idle", "Idle"],
  ["run", "Corrida"],
  ["attack", "Ataque"],
  ["attack_punch", "Soco"],
  ["roar", "Rugido"],
  ["death", "Morte"],
];

const ANIM_ROOT_LABEL: Record<string, string> = {
  mutant: "Mutante",
};

const ARCHETYPE_LABEL: Record<string, string> = {
  fixed: "Fixo",
  chaser: "Perseguidor",
  ranged: "Longo alcance",
};

const MONSTER_MODEL_DIRS = ["/models/monsters/", "/models/enemies/", "/models/creatures/"];

interface MonsterJsonEntry {
  id: string;
  name: string;
  archetype: string;
  isBoss: boolean;
  modelUrl: string;
}

const MONSTER_JSON = monstersData as MonsterJsonEntry[];

function humanClipUrl(id: string): string {
  return SHARED_CLIP_IDS.has(id) ? `${SHARED_ANIM_ROOT}/${id}.glb` : `${HUMAN_ANIM_ROOT}/${id}.glb`;
}

function fileStem(path: string): string {
  const file = path.slice(path.lastIndexOf("/") + 1);
  return file.endsWith(".glb") ? file.slice(0, -4) : file;
}

function clipIdsForRoot(root: string, models: string[]): string[] {
  const prefix = `${root}/`;
  const ids = new Set<string>();
  for (const path of models) {
    if (!path.startsWith(prefix) || !path.endsWith(".glb")) continue;
    ids.add(fileStem(path));
  }
  return [...ids];
}

function buildClipDefs(
  root: string,
  order: Array<[string, string]>,
  models: string[],
  urlFor: (id: string) => string,
  embeddedIdle: boolean,
): ClipDef[] {
  const ids = new Set<string>([...clipIdsForRoot(root, models), ...order.map(([id]) => id)]);
  const known = new Set(order.map(([id]) => id));
  const listed: ClipDef[] = order
    .filter(([id]) => ids.has(id))
    .map(([id, label]) => ({ id, label, url: urlFor(id) }));
  const extras: ClipDef[] = [...ids]
    .filter((id) => !known.has(id))
    .sort()
    .map((id) => ({ id, label: id, url: urlFor(id) }));
  const clips = embeddedIdle
    ? [{ id: IDLE_CLIP_ID, label: "Idle (classe)", url: "" }, ...listed, ...extras]
    : [...listed, ...extras];
  return clips;
}

function buildMonsterClips(models: string[]): ClipSetDef | null {
  const clips = buildClipDefs(
    MONSTER_ANIM_ROOT,
    MONSTER_CLIP_ORDER,
    models,
    (clipId) => `${MONSTER_ANIM_ROOT}/${clipId}.glb`,
    false,
  );
  if (!clips.length) return null;
  return { id: "mutant", label: ANIM_ROOT_LABEL.mutant ?? "Mutante", clips };
}

function buildMonsters(models: string[]): MonsterEntry[] {
  const monsterModels = models.filter((path) => MONSTER_MODEL_DIRS.some((dir) => path.startsWith(dir)));
  return MONSTER_JSON.map((def) => {
    const explicit = def.modelUrl.trim();
    const guessed =
      monsterModels.find((path) => fileStem(path) === def.id) ??
      monsterModels.find((path) => {
        const stem = fileStem(path);
        return def.id.includes(stem) || stem.includes(def.id);
      }) ??
      "";
    return {
      id: def.id,
      name: def.name,
      archetypeLabel: ARCHETYPE_LABEL[def.archetype] ?? def.archetype,
      isBoss: def.isBoss === true,
      modelUrl: explicit || guessed,
      expectedUrl: `/models/monsters/${def.id}.glb`,
    };
  });
}

export function buildCatalog(models: string[]): LabCatalog {
  return {
    classes: CLASS_DEFS.map((def) => ({ ...def })),
    humanClips: buildClipDefs(HUMAN_ANIM_ROOT, HUMAN_CLIP_ORDER, models, humanClipUrl, true),
    monsterClips: buildMonsterClips(models),
    monsters: buildMonsters(models),
    weaponSets: WEAPON_SET_IDS.map((id) => ({ id, label: WEAPON_SET_LABEL[id] })),
  };
}

export function findClip(clips: ClipDef[], id: string): ClipDef | null {
  return clips.find((clip) => clip.id === id) ?? null;
}

export async function loadAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch("/api/dev/models");
    if (!response.ok) return [];
    const body: unknown = await response.json();
    if (!Array.isArray(body)) return [];
    return body.filter((path): path is string => typeof path === "string");
  } catch {
    return [];
  }
}
