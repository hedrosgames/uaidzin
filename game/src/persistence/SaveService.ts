import { saveVault, type CharacterLoadResult } from "./SaveVault";
import { SAVE_VERSION, type SavePayload } from "./SaveTypes";

export { SAVE_VERSION, type SavePayload, type CharacterLoadResult };

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

  async load(): Promise<CharacterLoadResult> {
    return saveVault.loadCharacter();
  }

  async clear(): Promise<void> {
    await saveVault.wipeProfile(saveVault.getProfileId());
  }
}
