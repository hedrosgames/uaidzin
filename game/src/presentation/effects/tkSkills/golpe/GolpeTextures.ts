import { type Texture } from "three";
import {
  createCanvasTexture as createTexture,
  drawRadialGlow,
} from "../../vfxKit/canvasTexture";

export interface GolpeTextureSet {
  spark: Texture;
  metal: Texture;
}

export function createGolpeTextures(): GolpeTextureSet {
  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,244,1)"],
      [0.2, "rgba(255,214,120,1)"],
      [0.48, "rgba(255,138,42,0.78)"],
      [1, "rgba(140,40,8,0)"],
    ]);
  });

  const metal = createTexture(128, 128, (context) => {
    const iron = context.createLinearGradient(0, 0, 0, 128);
    iron.addColorStop(0, "#120d0a");
    iron.addColorStop(0.3, "#3a2c20");
    iron.addColorStop(0.52, "#8a5a2e");
    iron.addColorStop(0.7, "#2b1e16");
    iron.addColorStop(1, "#0e0a08");
    context.fillStyle = iron;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.3;
    context.strokeStyle = "#ff9a3a";
    context.lineWidth = 2;
    for (let offset = -64; offset < 192; offset += 18) {
      context.beginPath();
      context.moveTo(offset, 128);
      context.lineTo(offset + 64, 0);
      context.stroke();
    }
    context.globalAlpha = 0.5;
    for (let index = 0; index < 12; index += 1) {
      const x = (index * 37) % 128;
      const y = (index * 53) % 128;
      const ember = context.createRadialGradient(x, y, 0, x, y, 7);
      ember.addColorStop(0, "rgba(255,196,88,0.9)");
      ember.addColorStop(1, "rgba(255,90,16,0)");
      context.fillStyle = ember;
      context.fillRect(x - 7, y - 7, 14, 14);
    }
    context.globalAlpha = 1;
  });

  return { spark, metal };
}

export function disposeGolpeTextures(textures: GolpeTextureSet): void {
  textures.spark.dispose();
  textures.metal.dispose();
}
