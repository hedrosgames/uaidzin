import { saveVault } from "./SaveVault";
import { SAVE_VERSION, type SavePayload } from "./SaveTypes";

export { SAVE_VERSION, type SavePayload };

export class SaveService {
  setProfileId(id: string): void {
    saveVault.setProfileId(id);
  }

  getProfileId(): string {
    return saveVault.getProfileId();
  }

  async save(payload: SavePayload): Promise<void> {
    await saveVault.saveCharacter(payload, { immediate: true });
  }

  async load(): Promise<SavePayload | null> {
    return saveVault.loadCharacter();
  }

  async clear(): Promise<void> {
    await saveVault.wipeProfile(saveVault.getProfileId());
  }
}
