import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface QuebraTextureSet {
  shard: Texture;
  spark: Texture;
}

export function createQuebraTextures(): QuebraTextureSet {
  const shard = createTexture(128, 128, (context) => {
    context.translate(64, 64);
    context.rotate(-0.5);
    const facet = context.createLinearGradient(-46, -30, 46, 30);
    facet.addColorStop(0, "rgba(240,230,208,0.98)");
    facet.addColorStop(0.32, "rgba(212,160,23,0.94)");
    facet.addColorStop(0.55, "rgba(120,108,92,0.9)");
    facet.addColorStop(0.78, "rgba(36,28,20,0.86)");
    facet.addColorStop(1, "rgba(16,12,8,0)");
    context.fillStyle = facet;
    context.beginPath();
    context.moveTo(-46, 6);
    context.lineTo(-12, -30);
    context.lineTo(30, -22);
    context.lineTo(48, 10);
    context.lineTo(14, 32);
    context.lineTo(-28, 28);
    context.closePath();
    context.fill();
    context.globalAlpha = 0.42;
    context.strokeStyle = "rgba(255,236,190,0.9)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-46, 6);
    context.lineTo(30, -22);
    context.stroke();
    context.globalAlpha = 1;
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,252,238,1)"],
      [0.2, "rgba(255,226,140,1)"],
      [0.5, "rgba(212,160,23,0.8)"],
      [1, "rgba(74,50,20,0)"],
    ]);
  });

  return { shard, spark };
}

export function disposeQuebraTextures(textures: QuebraTextureSet): void {
  textures.shard.dispose();
  textures.spark.dispose();
}
