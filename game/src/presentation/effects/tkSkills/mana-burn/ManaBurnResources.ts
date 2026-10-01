import {
  AdditiveBlending,
  DoubleSide,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  type CanvasTexture,
} from "three";
import { ManaBurnTextures } from "./ManaBurnTextures";

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
  readonly materials = {
    ember: material("ember", this.textures.ring, 0xd9a75c, 0.9, true),
    arc: material("arc", this.textures.ring, 0x9dc4ff, 0.8, true),
    flash: material("flash", this.textures.ring, 0xffffff, 0.92, true),
    flame: material("flame", this.textures.surge, 0xffffff, 1, false),
    drain: material("drain", this.textures.spark, 0xffffff, 0.94, true),
    mote: material("mote", this.textures.spark, 0xffffff, 0.8, true),
    residual: material("residual", this.textures.spark, 0xffffff, 0.72, true),
  };

  constructor() {
    this.ringGeometry.name = "ManaBurn.ring";
    this.ringGeometry.computeBoundingBox();
    this.ringGeometry.computeBoundingSphere();
  }

  dispose(): void {
    this.ringGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.textures.dispose();
  }
}
