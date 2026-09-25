import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface PurificarTextureSet {
  mote: Texture;
  halo: Texture;
}

export function createPurificarTextures(): PurificarTextureSet {
  const mote = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,253,244,1)"],
      [0.18, "rgba(244,236,214,0.98)"],
      [0.42, "rgba(226,196,120,0.82)"],
      [0.66, "rgba(212,160,23,0.5)"],
      [1, "rgba(90,66,20,0)"],
    ]);
  });

  const halo = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(248,240,220,0.7)"],
      [0.35, "rgba(226,200,140,0.4)"],
      [0.68, "rgba(212,160,23,0.16)"],
      [1, "rgba(80,60,24,0)"],
    ]);
  });

  return { mote, halo };
}

export function disposePurificarTextures(textures: PurificarTextureSet): void {
  textures.mote.dispose();
  textures.halo.dispose();
}
