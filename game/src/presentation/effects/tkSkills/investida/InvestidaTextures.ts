import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface InvestidaTextureSet {
  wind: Texture;
  dust: Texture;
  spark: Texture;
  link: Texture;
}

export function createInvestidaTextures(): InvestidaTextureSet {
  const wind = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(244,250,255,1)"],
      [0.2, "rgba(214,232,242,0.92)"],
      [0.52, "rgba(158,186,200,0.5)"],
      [1, "rgba(64,86,98,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.3;
    for (let index = 0; index < 7; index += 1) {
      const y = 14 + index * 17;
      const streak = context.createLinearGradient(8, y, 120, y);
      streak.addColorStop(0, "rgba(230,244,252,0)");
      streak.addColorStop(0.5, "rgba(230,244,252,0.66)");
      streak.addColorStop(1, "rgba(230,244,252,0)");
      context.fillStyle = streak;
      context.fillRect(8, y, 112, 3);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });
  wind.name = "investida-wind-atlas";

  const dust = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(206,186,152,0.94)"],
      [0.4, "rgba(178,156,122,0.7)"],
      [0.74, "rgba(128,110,84,0.34)"],
      [1, "rgba(72,60,44,0)"],
    ]);
    context.globalAlpha = 0.24;
    for (let index = 0; index < 16; index += 1) {
      const x = 18 + ((index * 41) % 92);
      const y = 18 + ((index * 67) % 92);
      const speck = context.createRadialGradient(x, y, 0, x, y, 7);
      speck.addColorStop(0, "rgba(236,220,190,0.9)");
      speck.addColorStop(1, "rgba(236,220,190,0)");
      context.fillStyle = speck;
      context.fillRect(x - 7, y - 7, 14, 14);
    }
    context.globalAlpha = 1;
  });
  dust.name = "investida-dust-atlas";

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,248,1)"],
      [0.24, "rgba(226,232,240,0.9)"],
      [0.52, "rgba(168,190,204,0.6)"],
      [1, "rgba(90,110,124,0)"],
    ]);
  });
  spark.name = "investida-spark-atlas";

  const link = createTexture(128, 128, (context) => {
    const steel = context.createLinearGradient(0, 0, 0, 128);
    steel.addColorStop(0, "#10141a");
    steel.addColorStop(0.24, "#39434e");
    steel.addColorStop(0.46, "#8e9aa6");
    steel.addColorStop(0.6, "#242c34");
    steel.addColorStop(0.84, "#5c6873");
    steel.addColorStop(1, "#0d1116");
    context.fillStyle = steel;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.3;
    context.strokeStyle = "#d8e2ea";
    context.lineWidth = 3;
    for (let offset = -128; offset < 256; offset += 26) {
      context.beginPath();
      context.moveTo(offset, 128);
      context.lineTo(offset + 128, 0);
      context.stroke();
    }
    context.globalAlpha = 0.34;
    context.fillStyle = "#d4a017";
    for (let index = 0; index < 12; index += 1) {
      const x = (index * 31) % 128;
      const y = (index * 53) % 128;
      context.beginPath();
      context.ellipse(x, y, 4, 2, -0.5, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  });
  link.name = "investida-link-atlas";

  return { wind, dust, spark, link };
}

export function disposeInvestidaTextures(textures: InvestidaTextureSet): void {
  textures.wind.dispose();
  textures.dust.dispose();
  textures.spark.dispose();
  textures.link.dispose();
}
