import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface TribunalTextureSet {
  beam: Texture;
  spark: Texture;
  trail: Texture;
  fissure: Texture;
}

export function createTribunalTextures(): TribunalTextureSet {
  const beam = createTexture(128, 256, (context) => {
    const vertical = context.createLinearGradient(0, 0, 0, 256);
    vertical.addColorStop(0, "rgba(212,160,23,0)");
    vertical.addColorStop(0.42, "rgba(255,214,90,0.6)");
    vertical.addColorStop(0.82, "rgba(255,238,170,0.96)");
    vertical.addColorStop(1, "rgba(255,250,226,1)");
    context.fillStyle = vertical;
    context.fillRect(0, 0, 128, 256);
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < 10; index += 1) {
      const x = 10 + (index * 109) % 108;
      const y = 30 + (index * 73) % 200;
      const glow = context.createRadialGradient(x, y, 0, x, y, 22);
      glow.addColorStop(0, "rgba(255,244,190,0.5)");
      glow.addColorStop(1, "rgba(212,160,23,0)");
      context.fillStyle = glow;
      context.fillRect(x - 22, y - 22, 44, 44);
    }
    const ember = context.createRadialGradient(64, 236, 0, 64, 236, 70);
    ember.addColorStop(0, "rgba(255,120,60,0.35)");
    ember.addColorStop(1, "rgba(163,59,59,0)");
    context.fillStyle = ember;
    context.fillRect(0, 160, 128, 96);
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,252,236,1)"],
      [0.2, "rgba(255,232,120,1)"],
      [0.5, "rgba(212,160,23,0.82)"],
      [0.82, "rgba(163,59,59,0.3)"],
      [1, "rgba(90,20,8,0)"],
    ]);
  });

  const trail = createTexture(192, 48, (context) => {
    const length = context.createLinearGradient(0, 0, 192, 0);
    length.addColorStop(0, "rgba(140,40,10,0)");
    length.addColorStop(0.2, "rgba(212,160,23,0.86)");
    length.addColorStop(0.72, "rgba(255,238,150,0.98)");
    length.addColorStop(1, "rgba(255,252,236,0)");
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

  const fissure = createTexture(192, 48, (context) => {
    const length = context.createLinearGradient(0, 0, 192, 0);
    length.addColorStop(0, "rgba(163,59,59,0)");
    length.addColorStop(0.24, "rgba(212,160,23,0.78)");
    length.addColorStop(0.7, "rgba(255,232,120,0.96)");
    length.addColorStop(1, "rgba(255,250,226,0)");
    context.fillStyle = length;
    context.fillRect(0, 0, 192, 48);
    context.globalCompositeOperation = "destination-in";
    const width = context.createLinearGradient(0, 0, 0, 48);
    width.addColorStop(0, "rgba(0,0,0,0)");
    width.addColorStop(0.32, "rgba(0,0,0,0.9)");
    width.addColorStop(0.5, "rgba(0,0,0,1)");
    width.addColorStop(0.68, "rgba(0,0,0,0.9)");
    width.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = width;
    context.fillRect(0, 0, 192, 48);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.5;
    for (let index = 0; index < 12; index += 1) {
      const x = (index * 37) % 192;
      const y = 24 + Math.sin(index * 2.3) * 14;
      const branch = context.createRadialGradient(x, y, 0, x, y, 9);
      branch.addColorStop(0, "rgba(255,244,190,0.85)");
      branch.addColorStop(1, "rgba(212,160,23,0)");
      context.fillStyle = branch;
      context.fillRect(x - 9, y - 9, 18, 18);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  return { beam, spark, trail, fissure };
}

export function disposeTribunalTextures(textures: TribunalTextureSet): void {
  textures.beam.dispose();
  textures.spark.dispose();
  textures.trail.dispose();
  textures.fissure.dispose();
}
