import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface FuriaTextureSet {
  ember: Texture;
  spark: Texture;
}

export function createFuriaTextures(): FuriaTextureSet {
  const ember = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,214,170,1)"],
      [0.18, "rgba(255,122,64,0.96)"],
      [0.44, "rgba(214,58,32,0.72)"],
      [0.72, "rgba(122,18,10,0.34)"],
      [1, "rgba(40,6,4,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.22;
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2 + 0.4;
      const x = 64 + Math.cos(angle) * 30;
      const y = 64 + Math.sin(angle) * 30;
      const glow = context.createRadialGradient(x, y, 0, x, y, 15);
      glow.addColorStop(0, "rgba(255,150,70,0.72)");
      glow.addColorStop(1, "rgba(140,30,12,0)");
      context.fillStyle = glow;
      context.fillRect(x - 15, y - 15, 30, 30);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,238,214,1)"],
      [0.22, "rgba(255,140,72,0.92)"],
      [0.52, "rgba(196,52,26,0.62)"],
      [1, "rgba(70,10,6,0)"],
    ]);
  });

  return { ember, spark };
}

export function disposeFuriaTextures(textures: FuriaTextureSet): void {
  textures.ember.dispose();
  textures.spark.dispose();
}
