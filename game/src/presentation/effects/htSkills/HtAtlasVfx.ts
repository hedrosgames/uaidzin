import type { Scene } from "three";
import type { TkLightPool } from "../TkLightPool";
import { StylizedSkillVfxController } from "../skill/StylizedSkillVfx";
import { HT_ATLAS_DEFS, type HtDedicatedVfxId } from "./HtAtlasDefs";

export class HtAtlasVfxController extends StylizedSkillVfxController<HtDedicatedVfxId> {
  constructor(scene: Scene, lightPool?: TkLightPool) {
    super(scene, HT_ATLAS_DEFS, "ht", 0.6, lightPool);
  }
}
