import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface PosturaTextureSet {
  flash: Texture;
  spark: Texture;
  mote: Texture;
}

export function createPosturaTextures(): PosturaTextureSet {
  const flash = createTexture(256, 256, (context) => {
    drawRadialGlow(context, 128, 128, [
      [0, "rgba(240,230,208,0.95)"],
      [0.2, "rgba(212,160,23,0.7)"],
      [0.46, "rgba(140,105,25,0.3)"],
      [1, "rgba(30,24,12,0)"],
    ]);
  });

  const spark = createTexture(128, 32, (context) => {
    const gradient = context.createLinearGradient(0, 0, 128, 0);
    gradient.addColorStop(0, "rgba(212,160,23,0)");
    gradient.addColorStop(0.35, "rgba(232,197,71,0.9)");
    gradient.addColorStop(0.5, "rgba(250,238,205,1)");
    gradient.addColorStop(0.65, "rgba(232,197,71,0.9)");
    gradient.addColorStop(1, "rgba(212,160,23,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 32);
    const core = context.createRadialGradient(64, 16, 0, 64, 16, 14);
    core.addColorStop(0, "rgba(255,246,224,1)");
    core.addColorStop(1, "rgba(255,246,224,0)");
    context.fillStyle = core;
    context.fillRect(0, 0, 128, 32);
  });

  const mote = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(240,230,208,1)"],
      [0.24, "rgba(212,160,23,0.85)"],
      [0.55, "rgba(120,90,24,0.4)"],
      [1, "rgba(36,28,20,0)"],
    ]);
  });

  return { flash, spark, mote };
}

export function disposePosturaTextures(textures: PosturaTextureSet): void {
  textures.flash.dispose();
  textures.spark.dispose();
  textures.mote.dispose();
}
