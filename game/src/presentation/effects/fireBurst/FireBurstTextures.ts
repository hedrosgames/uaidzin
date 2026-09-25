import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../vfxKit/canvasTexture";

export interface FireBurstTextureSet {
  fire: Texture;
  spark: Texture;
  trail: Texture;
  chain: Texture;
}

export function createFireBurstTextures(): FireBurstTextureSet {
  const fire = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,255,226,1)"],
      [0.14, "rgba(255,242,117,1)"],
      [0.36, "rgba(255,165,0,0.96)"],
      [0.66, "rgba(226,74,14,0.56)"],
      [1, "rgba(96,18,6,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.28;
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const x = 64 + Math.cos(angle) * 34;
      const y = 64 + Math.sin(angle) * 34;
      const glow = context.createRadialGradient(x, y, 0, x, y, 18);
      glow.addColorStop(0, "rgba(255,221,92,0.8)");
      glow.addColorStop(1, "rgba(255,92,12,0)");
      context.fillStyle = glow;
      context.fillRect(x - 18, y - 18, 36, 36);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,244,1)"],
      [0.2, "rgba(255,242,117,1)"],
      [0.48, "rgba(255,138,24,0.78)"],
      [1, "rgba(160,35,4,0)"],
    ]);
  });

  const trail = createTexture(192, 48, (context) => {
    const length = context.createLinearGradient(0, 0, 192, 0);
    length.addColorStop(0, "rgba(122,22,8,0)");
    length.addColorStop(0.18, "rgba(255,165,0,0.88)");
    length.addColorStop(0.72, "rgba(255,242,117,0.98)");
    length.addColorStop(1, "rgba(255,255,226,0)");
    context.fillStyle = length;
    context.fillRect(0, 0, 192, 48);
    context.globalCompositeOperation = "destination-in";
    const width = context.createLinearGradient(0, 0, 0, 48);
    width.addColorStop(0, "rgba(0,0,0,0)");
    width.addColorStop(0.24, "rgba(0,0,0,0.8)");
    width.addColorStop(0.5, "rgba(0,0,0,1)");
    width.addColorStop(0.76, "rgba(0,0,0,0.8)");
    width.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = width;
    context.fillRect(0, 0, 192, 48);
    context.globalCompositeOperation = "source-over";
  });

  const chain = createTexture(128, 128, (context) => {
    const metal = context.createLinearGradient(0, 0, 0, 128);
    metal.addColorStop(0, "#160f0c");
    metal.addColorStop(0.22, "#4a3023");
    metal.addColorStop(0.44, "#b27a43");
    metal.addColorStop(0.58, "#2d1d18");
    metal.addColorStop(0.82, "#6b3b20");
    metal.addColorStop(1, "#120c0a");
    context.fillStyle = metal;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.34;
    context.strokeStyle = "#ffd37a";
    context.lineWidth = 3;
    for (let offset = -128; offset < 256; offset += 22) {
      context.beginPath();
      context.moveTo(offset, 128);
      context.lineTo(offset + 128, 0);
      context.stroke();
    }
    context.globalAlpha = 0.42;
    context.fillStyle = "#ff8a2a";
    for (let index = 0; index < 14; index += 1) {
      const x = (index * 29) % 128;
      const y = (index * 47) % 128;
      context.beginPath();
      context.ellipse(x, y, 5, 2.5, -0.55, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  });

  return { fire, spark, trail, chain };
}

export function disposeFireBurstTextures(textures: FireBurstTextureSet): void {
  textures.fire.dispose();
  textures.spark.dispose();
  textures.trail.dispose();
  textures.chain.dispose();
}
