import {
  AdditiveBlending,
  DoubleSide,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  type CanvasTexture,
} from "three";
import { ManaBurnTextures } from "./ManaBurnTextures";
import { createBladeGeometry } from "../../vfxKit/stylizedGeometry";

function material(
  name: string,
  map: CanvasTexture,
  color: number,
  opacity: number,
  additive: boolean,
): MeshBasicMaterial {
  const result = new MeshBasicMaterial({
    name: `ManaBurn.${name}`,
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : NormalBlending,
    alphaTest: 0.003,
    toneMapped: false,
  });
  result.forceSinglePass = true;
  return result;
}

export class ManaBurnResources {
  readonly textures: ManaBurnTextures = new ManaBurnTextures();
  readonly ringGeometry: PlaneGeometry = new PlaneGeometry(2, 2);
  readonly flameBodyGeometry = createBladeGeometry(0.74, 0.28, 0.04);
  readonly materials = {
    ember: material("ember", this.textures.ring, 0xc68a48, 0.9, false),
    arc: material("arc", this.textures.ring, 0x72b8e2, 0.8, true),
    flash: material("flash", this.textures.ring, 0xffdea5, 0.66, true),
    flame: material("flame", this.textures.surge, 0xffffff, 1, false),
    drain: material("drain", this.textures.spark, 0x99ceea, 0.94, true),
    mote: material("mote", this.textures.spark, 0xffffff, 0.8, true),
    residual: material("residual", this.textures.spark, 0xffffff, 0.72, true),
    flameBody: new MeshBasicMaterial({
      color: 0xe0b778,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    }),
  };

  constructor() {
    this.ringGeometry.name = "ManaBurn.ring";
    this.ringGeometry.computeBoundingBox();
    this.ringGeometry.computeBoundingSphere();
  }

  dispose(): void {
    this.ringGeometry.dispose();
    this.flameBodyGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.textures.dispose();
  }
}
