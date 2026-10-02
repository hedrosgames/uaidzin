import type { Scene } from "three";
import type { TkLightPool } from "../TkLightPool";
import { StylizedSkillVfxController } from "../skill/StylizedSkillVfx";
import { BM_ATLAS_DEFS, type BmDedicatedVfxId } from "./BmAtlasDefs";

export class BmAtlasVfxController extends StylizedSkillVfxController<BmDedicatedVfxId> {
  constructor(scene: Scene, lightPool?: TkLightPool) {
    super(scene, BM_ATLAS_DEFS, "bm", 1, lightPool);
  }
}
