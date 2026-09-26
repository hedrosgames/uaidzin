import { Group, MathUtils, type Object3D } from "three";
import type { WeaponRig } from "../../presentation/player/WeaponRig";

export type WeaponSide = "left" | "right";
export type Triple = [number, number, number];

export interface MountAdjust {
  position: Triple;
  rotation: Triple;
  scale: number;
}

export interface MountFileEntry {
  class: string;
  set: string;
  side: WeaponSide;
  position: Triple;
  rotation: Triple;
  scale: number;
}

export interface MountFile {
  mounts: MountFileEntry[];
}

export interface WeaponPiece {
  side: WeaponSide;
  modelId: string;
  visual: Object3D;
  group: Group;
}

const ADJUST_GROUP_NAME = "mount-adjust";
export const SIDE_LABEL: Record<WeaponSide, string> = { right: "Direita", left: "Esquerda" };
export const NEUTRAL_ADJUST: MountAdjust = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };

export const WEAPON_PIECE_LABEL: Record<string, string> = {
  axe: "Machado",
  sword: "Espada",
  greatsword: "Espadão",
  staff: "Cajado",
  greatstaff: "Cajadão",
  bow: "Arco",
  shield: "Escudo",
  glove: "Garra",
};

export function cloneAdjust(adjust: MountAdjust): MountAdjust {
  return {
    position: [...adjust.position],
    rotation: [...adjust.rotation],
    scale: adjust.scale,
  };
}

export function mountKey(classId: string, set: string, side: WeaponSide): string {
  return `${classId}|${set}|${side}`;
}

function isTriple(value: unknown): value is Triple {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function isSide(value: unknown): value is WeaponSide {
  return value === "left" || value === "right";
}

export function parseMountFile(raw: unknown): Map<string, MountAdjust> {
  const table = new Map<string, MountAdjust>();
  if (!raw || typeof raw !== "object") return table;
  const entries = (raw as { mounts?: unknown }).mounts;
  if (!Array.isArray(entries)) return table;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Partial<MountFileEntry>;
    if (typeof item.class !== "string" || typeof item.set !== "string" || !isSide(item.side)) continue;
    if (!isTriple(item.position) || !isTriple(item.rotation)) continue;
    const scale = typeof item.scale === "number" && Number.isFinite(item.scale) ? item.scale : 1;
    table.set(mountKey(item.class, item.set, item.side), {
      position: [...item.position],
      rotation: [...item.rotation],
      scale,
    });
  }
  return table;
}

export function serializeMountFile(table: Map<string, MountAdjust>): MountFile {
  const mounts: MountFileEntry[] = [];
  for (const [key, adjust] of table) {
    const [classId, setId, side] = key.split("|");
    if (!classId || !setId || !isSide(side)) continue;
    mounts.push({
      class: classId,
      set: setId,
      side,
      position: [...adjust.position],
      rotation: [...adjust.rotation],
      scale: adjust.scale,
    });
  }
  mounts.sort((a, b) => mountKey(a.class, a.set, a.side).localeCompare(mountKey(b.class, b.set, b.side)));
  return { mounts };
}

export function pieceLabel(piece: WeaponPiece): string {
  return `${SIDE_LABEL[piece.side]} · ${WEAPON_PIECE_LABEL[piece.modelId] ?? piece.modelId}`;
}

function ensureAdjustGroup(visual: Object3D): Group {
  const found = visual.getObjectByName(ADJUST_GROUP_NAME);
  if (found instanceof Group) return found;
  const group = new Group();
  group.name = ADJUST_GROUP_NAME;
  for (const child of [...visual.children]) group.add(child);
  visual.add(group);
  return group;
}

export function applyPieceAdjust(piece: WeaponPiece, adjust: MountAdjust): void {
  piece.group.position.set(adjust.position[0], adjust.position[1], adjust.position[2]);
  piece.group.rotation.set(
    MathUtils.degToRad(adjust.rotation[0]),
    MathUtils.degToRad(adjust.rotation[1]),
    MathUtils.degToRad(adjust.rotation[2]),
  );
  piece.group.scale.setScalar(adjust.scale);
}

export function collectPieces(rig: WeaponRig): WeaponPiece[] {
  const pieces: WeaponPiece[] = [];
  for (const visual of rig.getVisualRoots()) {
    const parts = visual.name.split("-");
    const side: WeaponSide = parts[1] === "left" ? "left" : "right";
    pieces.push({
      side,
      modelId: parts.slice(2).join("-"),
      visual,
      group: ensureAdjustGroup(visual),
    });
  }
  pieces.sort((a, b) => (a.side === b.side ? 0 : a.side === "right" ? -1 : 1));
  return pieces;
}
