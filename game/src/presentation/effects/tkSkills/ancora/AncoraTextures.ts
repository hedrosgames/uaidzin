import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface AncoraTextureSet {
  glow: Texture;
  spark: Texture;
  spectral: Texture;
}

export function createAncoraTextures(): AncoraTextureSet {
  const glow = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,236,208,1)"],
      [0.2, "rgba(232,120,60,0.95)"],
      [0.44, "rgba(196,69,42,0.68)"],
      [0.74, "rgba(120,26,12,0.26)"],
      [1, "rgba(36,28,20,0)"],
    ]);
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,246,224,1)"],
      [0.26, "rgba(240,164,64,1)"],
      [0.54, "rgba(196,69,42,0.72)"],
      [1, "rgba(80,18,8,0)"],
    ]);
  });

  const spectral = createTexture(128, 256, (context) => {
    const horizontal = context.createLinearGradient(0, 0, 128, 0);
    horizontal.addColorStop(0, "rgba(212,160,23,0)");
    horizontal.addColorStop(0.24, "rgba(240,230,208,0.42)");
    horizontal.addColorStop(0.5, "rgba(232,197,71,0.92)");
    horizontal.addColorStop(0.76, "rgba(240,230,208,0.42)");
    horizontal.addColorStop(1, "rgba(212,160,23,0)");
    context.fillStyle = horizontal;
    context.fillRect(0, 0, 128, 256);
    context.globalCompositeOperation = "destination-in";
    const vertical = context.createLinearGradient(0, 0, 0, 256);
    vertical.addColorStop(0, "rgba(0,0,0,0.7)");
    vertical.addColorStop(0.4, "rgba(0,0,0,1)");
    vertical.addColorStop(0.9, "rgba(0,0,0,0.85)");
    vertical.addColorStop(1, "rgba(0,0,0,0.3)");
    context.fillStyle = vertical;
    context.fillRect(0, 0, 128, 256);
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "rgba(240,230,208,0.22)";
    context.lineWidth = 2;
    for (let index = 0; index < 5; index += 1) {
      const offset = 28 + index * 44;
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + 14, 256);
      context.stroke();
    }
  });

  return { glow, spark, spectral };
}

export function disposeAncoraTextures(textures: AncoraTextureSet): void {
  textures.glow.dispose();
  textures.spark.dispose();
  textures.spectral.dispose();
}
