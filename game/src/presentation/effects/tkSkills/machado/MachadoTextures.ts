import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface MachadoTextureSet {
  ember: Texture;
  spark: Texture;
  trail: Texture;
}

export function createMachadoTextures(): MachadoTextureSet {
  const ember = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,255,230,1)"],
      [0.16, "rgba(255,226,110,1)"],
      [0.4, "rgba(255,140,20,0.94)"],
      [0.7, "rgba(210,66,12,0.5)"],
      [1, "rgba(84,14,4,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.3;
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2;
      const x = 64 + Math.cos(angle) * 36;
      const y = 64 + Math.sin(angle) * 36;
      const glow = context.createRadialGradient(x, y, 0, x, y, 16);
      glow.addColorStop(0, "rgba(255,214,92,0.75)");
      glow.addColorStop(1, "rgba(255,84,10,0)");
      context.fillStyle = glow;
      context.fillRect(x - 16, y - 16, 32, 32);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,246,1)"],
      [0.22, "rgba(255,232,120,1)"],
      [0.5, "rgba(255,130,22,0.8)"],
      [1, "rgba(150,32,4,0)"],
    ]);
  });

  const trail = createTexture(192, 48, (context) => {
    const length = context.createLinearGradient(0, 0, 192, 0);
    length.addColorStop(0, "rgba(120,20,6,0)");
    length.addColorStop(0.2, "rgba(255,150,24,0.86)");
    length.addColorStop(0.72, "rgba(255,232,118,0.98)");
    length.addColorStop(1, "rgba(255,255,230,0)");
    context.fillStyle = length;
    context.fillRect(0, 0, 192, 48);
    context.globalCompositeOperation = "destination-in";
    const width = context.createLinearGradient(0, 0, 0, 48);
    width.addColorStop(0, "rgba(0,0,0,0)");
    width.addColorStop(0.26, "rgba(0,0,0,0.8)");
    width.addColorStop(0.5, "rgba(0,0,0,1)");
    width.addColorStop(0.74, "rgba(0,0,0,0.8)");
    width.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = width;
    context.fillRect(0, 0, 192, 48);
    context.globalCompositeOperation = "source-over";
  });

  return { ember, spark, trail };
}

export function disposeMachadoTextures(textures: MachadoTextureSet): void {
  textures.ember.dispose();
  textures.spark.dispose();
  textures.trail.dispose();
}
