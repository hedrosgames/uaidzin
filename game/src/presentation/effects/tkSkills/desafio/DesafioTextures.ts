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
      [0, "rgba(226,255,211,1)"],
      [0.2, "rgba(112,224,79,0.96)"],
      [0.5, "rgba(72,172,48,0.72)"],
      [1, "rgba(15,60,10,0)"],
    ]);
  });

  const glow = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(196,255,166,0.94)"],
      [0.28, "rgba(88,190,60,0.64)"],
      [0.66, "rgba(42,112,28,0.28)"],
      [1, "rgba(8,34,6,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.24;
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + 0.7;
      const x = 64 + Math.cos(angle) * 28;
      const y = 64 + Math.sin(angle) * 28;
      const ember = context.createRadialGradient(x, y, 0, x, y, 14);
      ember.addColorStop(0, "rgba(122,230,88,0.74)");
      ember.addColorStop(1, "rgba(34,104,22,0)");
      context.fillStyle = ember;
      context.fillRect(x - 14, y - 14, 28, 28);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(238,255,226,1)"],
      [0.22, "rgba(138,238,102,0.94)"],
      [0.52, "rgba(72,172,48,0.66)"],
      [1, "rgba(15,54,10,0)"],
    ]);
  });

  return { beam, glow, spark };
}

export function disposeDesafioTextures(textures: DesafioTextureSet): void {
  textures.beam.dispose();
  textures.glow.dispose();
  textures.spark.dispose();
}
