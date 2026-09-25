import { type Texture } from "three";
import {
  createCanvasTexture as createTexture,
  drawRadialGlow,
} from "../../vfxKit/canvasTexture";

export interface DesafioTextureSet {
  beam: Texture;
  glow: Texture;
  spark: Texture;
}

export function createDesafioTextures(): DesafioTextureSet {
  const beam = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,224,208,1)"],
      [0.2, "rgba(228,112,92,0.95)"],
      [0.5, "rgba(163,59,59,0.68)"],
      [1, "rgba(64,12,10,0)"],
    ]);
  });

  const glow = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,196,176,0.92)"],
      [0.28, "rgba(180,70,56,0.6)"],
      [0.66, "rgba(104,26,22,0.24)"],
      [1, "rgba(30,6,6,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.24;
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + 0.7;
      const x = 64 + Math.cos(angle) * 28;
      const y = 64 + Math.sin(angle) * 28;
      const ember = context.createRadialGradient(x, y, 0, x, y, 14);
      ember.addColorStop(0, "rgba(228,120,96,0.7)");
      ember.addColorStop(1, "rgba(120,24,18,0)");
      context.fillStyle = ember;
      context.fillRect(x - 14, y - 14, 28, 28);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,242,226,1)"],
      [0.22, "rgba(238,132,104,0.92)"],
      [0.52, "rgba(163,59,59,0.6)"],
      [1, "rgba(60,10,8,0)"],
    ]);
  });

  return { beam, glow, spark };
}

export function disposeDesafioTextures(textures: DesafioTextureSet): void {
  textures.beam.dispose();
  textures.glow.dispose();
  textures.spark.dispose();
}
