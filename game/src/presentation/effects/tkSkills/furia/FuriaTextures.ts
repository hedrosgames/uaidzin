import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";
import { DEFAULT_FURIA_PALETTE, type FuriaPalette } from "./FuriaPalette";

export interface FuriaTextureSet {
  ember: Texture;
  spark: Texture;
}

export function createFuriaTextures(palette: FuriaPalette = DEFAULT_FURIA_PALETTE): FuriaTextureSet {
  const ember = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, palette.emberStops);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.22;
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2 + 0.4;
      const x = 64 + Math.cos(angle) * 30;
      const y = 64 + Math.sin(angle) * 30;
      const glow = context.createRadialGradient(x, y, 0, x, y, 15);
      glow.addColorStop(0, palette.emberStops[1]?.[1] ?? "rgba(255,150,70,0.72)");
      glow.addColorStop(1, palette.emberStops[4]?.[1] ?? "rgba(140,30,12,0)");
      context.fillStyle = glow;
      context.fillRect(x - 15, y - 15, 30, 30);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, palette.sparkStops);
  });

  return { ember, spark };
}

export function disposeFuriaTextures(textures: FuriaTextureSet): void {
  textures.ember.dispose();
  textures.spark.dispose();
}
