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
    horizontal.addColorStop(0, "rgba(171,126,61,0)");
    horizontal.addColorStop(0.22, "rgba(234,197,130,0.58)");
    horizontal.addColorStop(0.5, "rgba(255,245,215,1)");
    horizontal.addColorStop(0.78, "rgba(234,197,130,0.58)");
    horizontal.addColorStop(1, "rgba(171,126,61,0)");
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
      [0, "rgba(255,246,216,1)"],
      [0.18, "rgba(245,213,157,0.96)"],
      [0.42, "rgba(220,177,103,0.72)"],
      [0.72, "rgba(163,119,65,0.3)"],
      [1, "rgba(59,40,22,0)"],
    ]);
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,248,224,1)"],
      [0.24, "rgba(245,218,167,1)"],
      [0.52, "rgba(201,155,83,0.78)"],
      [1, "rgba(69,47,23,0)"],
    ]);
  });

  return { beam, glow, spark };
}

export function disposeJulgamentoTextures(textures: JulgamentoTextureSet): void {
  textures.beam.dispose();
  textures.glow.dispose();
  textures.spark.dispose();
}
