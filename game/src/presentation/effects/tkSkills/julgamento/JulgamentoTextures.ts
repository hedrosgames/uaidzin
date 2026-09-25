import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface JulgamentoTextureSet {
  beam: Texture;
  glow: Texture;
  spark: Texture;
}

export function createJulgamentoTextures(): JulgamentoTextureSet {
  const beam = createTexture(128, 256, (context) => {
    const horizontal = context.createLinearGradient(0, 0, 128, 0);
    horizontal.addColorStop(0, "rgba(212,160,23,0)");
    horizontal.addColorStop(0.22, "rgba(240,230,208,0.5)");
    horizontal.addColorStop(0.5, "rgba(255,248,214,1)");
    horizontal.addColorStop(0.78, "rgba(240,230,208,0.5)");
    horizontal.addColorStop(1, "rgba(212,160,23,0)");
    context.fillStyle = horizontal;
    context.fillRect(0, 0, 128, 256);
    context.globalCompositeOperation = "destination-in";
    const vertical = context.createLinearGradient(0, 0, 0, 256);
    vertical.addColorStop(0, "rgba(0,0,0,0.85)");
    vertical.addColorStop(0.45, "rgba(0,0,0,1)");
    vertical.addColorStop(0.92, "rgba(0,0,0,0.9)");
    vertical.addColorStop(1, "rgba(0,0,0,0.4)");
    context.fillStyle = vertical;
    context.fillRect(0, 0, 128, 256);
    context.globalCompositeOperation = "source-over";
  });

  const glow = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,252,236,1)"],
      [0.18, "rgba(248,222,120,0.96)"],
      [0.42, "rgba(212,160,23,0.7)"],
      [0.72, "rgba(163,59,59,0.28)"],
      [1, "rgba(60,16,8,0)"],
    ]);
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,246,1)"],
      [0.24, "rgba(248,228,120,1)"],
      [0.52, "rgba(212,160,23,0.75)"],
      [1, "rgba(120,30,10,0)"],
    ]);
  });

  return { beam, glow, spark };
}

export function disposeJulgamentoTextures(textures: JulgamentoTextureSet): void {
  textures.beam.dispose();
  textures.glow.dispose();
  textures.spark.dispose();
}
