import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface AuraTextureSet {
  halo: Texture;
  mote: Texture;
}

export function createAuraTextures(): AuraTextureSet {
  const halo = createTexture(256, 256, (context) => {
    drawRadialGlow(context, 128, 128, [
      [0, "rgba(240,230,208,0.9)"],
      [0.22, "rgba(212,160,23,0.66)"],
      [0.48, "rgba(212,160,23,0.34)"],
      [0.74, "rgba(120,88,18,0.14)"],
      [1, "rgba(40,30,8,0)"],
    ]);
  });

  const mote = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,246,224,1)"],
      [0.2, "rgba(232,197,71,0.92)"],
      [0.5, "rgba(212,160,23,0.56)"],
      [1, "rgba(80,58,10,0)"],
    ]);
  });

  return { halo, mote };
}

export function disposeAuraTextures(textures: AuraTextureSet): void {
  textures.halo.dispose();
  textures.mote.dispose();
}
