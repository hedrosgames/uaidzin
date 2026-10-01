import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface AuraTextureSet {
  halo: Texture;
  mote: Texture;
}

export function createAuraTextures(): AuraTextureSet {
  const halo = createTexture(256, 256, (context) => {
    drawRadialGlow(context, 128, 128, [
      [0, "rgba(220,248,255,0.94)"],
      [0.22, "rgba(104,202,255,0.7)"],
      [0.48, "rgba(64,154,238,0.38)"],
      [0.74, "rgba(34,96,170,0.16)"],
      [1, "rgba(8,30,58,0)"],
    ]);
  });

  const mote = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(238,252,255,1)"],
      [0.2, "rgba(145,224,255,0.94)"],
      [0.5, "rgba(69,163,238,0.62)"],
      [1, "rgba(12,48,86,0)"],
    ]);
  });

  return { halo, mote };
}

export function disposeAuraTextures(textures: AuraTextureSet): void {
  textures.halo.dispose();
  textures.mote.dispose();
}
