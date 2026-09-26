import {
  cloneAdjust,
  mountKey,
  parseMountFile,
  serializeMountFile,
  type MountAdjust,
  type WeaponSide,
} from "./WeaponMount";

const ENDPOINT = "/api/dev/weapon-mounts";

export const MOUNT_FILE_LABEL = "game/src/data/weapons/weapon-mounts.json";

export interface SaveReport {
  message: string;
  ok: boolean;
}

export class MountStore {
  private readonly table = new Map<string, MountAdjust>();

  async load(): Promise<void> {
    this.table.clear();
    const remote = await this.fetchFile();
    if (!remote) return;
    for (const [key, adjust] of remote) this.table.set(key, adjust);
  }

  get(classId: string, set: string, side: WeaponSide): MountAdjust | null {
    const found = this.table.get(mountKey(classId, set, side));
    return found ? cloneAdjust(found) : null;
  }

  isAdjusted(classId: string, set: string): boolean {
    return (
      this.table.has(mountKey(classId, set, "right")) || this.table.has(mountKey(classId, set, "left"))
    );
  }

  async save(classId: string, set: string, side: WeaponSide, adjust: MountAdjust): Promise<SaveReport> {
    const key = mountKey(classId, set, side);
    const previous = this.table.get(key) ?? null;
    this.table.set(key, cloneAdjust(adjust));
    if (await this.pushFile()) return { ok: true, message: `Posição gravada em ${MOUNT_FILE_LABEL}` };
    this.restore(key, previous);
    return { ok: false, message: `Falha ao gravar ${MOUNT_FILE_LABEL}` };
  }

  async remove(classId: string, set: string, side: WeaponSide): Promise<SaveReport> {
    const key = mountKey(classId, set, side);
    const previous = this.table.get(key);
    if (!previous) return { ok: true, message: "Sem posição salva para esta peça" };
    this.table.delete(key);
    if (await this.pushFile()) return { ok: true, message: "Posição removida — encaixe do jogo volta a valer" };
    this.restore(key, previous);
    return { ok: false, message: `Falha ao gravar ${MOUNT_FILE_LABEL}` };
  }

  private restore(key: string, previous: MountAdjust | null): void {
    if (previous) this.table.set(key, previous);
    else this.table.delete(key);
  }

  private async fetchFile(): Promise<Map<string, MountAdjust> | null> {
    try {
      const response = await fetch(ENDPOINT);
      if (!response.ok) return null;
      const body: unknown = await response.json();
      return parseMountFile(body);
    } catch {
      return null;
    }
  }

  private async pushFile(): Promise<boolean> {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeMountFile(this.table)),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
