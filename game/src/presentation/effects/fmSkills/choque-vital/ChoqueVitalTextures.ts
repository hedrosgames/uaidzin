import { createCanvasTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";
import type { Texture } from "three";

const TAU = Math.PI * 2;

export interface ChoqueVitalTextureSet {
  ironRail: Texture;
  runeBand: Texture;
  chargeCore: Texture;
  scorchRing: Texture;
  spark: Texture;
}

export function createChoqueVitalTextures(): ChoqueVitalTextureSet {
  const ironRail = createCanvasTexture(128, 128, (context) => {
    const iron = context.createLinearGradient(0, 0, 128, 0);
    iron.addColorStop(0, "#100e0c");
    iron.addColorStop(0.22, "#2e2822");
    iron.addColorStop(0.48, "#4c433a");
    iron.addColorStop(0.6, "#241e19");
    iron.addColorStop(0.84, "#3a322a");
    iron.addColorStop(1, "#0c0a08");
    context.fillStyle = iron;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.4;
    context.strokeStyle = "#8c7a5c";
    context.lineWidth = 1.6;
    for (let offset = -128; offset < 256; offset += 19) {
      context.beginPath();
      context.moveTo(offset, 128);
      context.lineTo(offset + 128, 0);
      context.stroke();
    }
    context.globalAlpha = 0.5;
    context.fillStyle = "#0a0806";
    for (let index = 0; index < 30; index += 1) {
      const x = (index * 37) % 128;
      const y = (index * 71) % 128;
      context.beginPath();
      context.arc(x, y, 1.4 + (index % 3) * 0.8, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  });

  const runeBand = createCanvasTexture(128, 128, (context) => {
    const bronze = context.createLinearGradient(0, 0, 0, 128);
    bronze.addColorStop(0, "#4a3618");
    bronze.addColorStop(0.26, "#b98c34");
    bronze.addColorStop(0.48, "#f0cd6a");
    bronze.addColorStop(0.66, "#8a6428");
    bronze.addColorStop(1, "#2a1e0e");
    context.fillStyle = bronze;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.55;
    context.strokeStyle = "#2a1c0c";
    context.lineWidth = 3;
    for (let rune = 0; rune < 6; rune += 1) {
      const y = 16 + rune * 20;
      context.beginPath();
      context.moveTo(18, y);
      context.lineTo(46, y - 8);
      context.lineTo(74, y + 8);
      context.lineTo(110, y);
      context.stroke();
    }
    context.globalAlpha = 0.4;
    context.fillStyle = "#fff3c4";
    for (let index = 0; index < 20; index += 1) {
      const x = (index * 59) % 128;
      const y = (index * 83) % 128;
      context.fillRect(x, y, 2, 2);
    }
    context.globalAlpha = 1;
  });

  const chargeCore = createCanvasTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,252,232,1)"],
      [0.14, "rgba(255,240,178,1)"],
      [0.36, "rgba(240,196,86,0.92)"],
      [0.66, "rgba(168,104,26,0.36)"],
      [1, "rgba(70,34,6,0)"],
    ]);
  });

  const scorchRing = createCanvasTexture(192, 192, (context) => {
    context.clearRect(0, 0, 192, 192);
    context.globalCompositeOperation = "lighter";
    for (let ring = 0; ring < 3; ring += 1) {
      context.beginPath();
      context.arc(96, 96, 44 + ring * 20, 0, TAU);
      context.strokeStyle = `rgba(${246 - ring * 30},${206 - ring * 34},${110 - ring * 30},${0.44 - ring * 0.12})`;
      context.lineWidth = 8 - ring * 2;
      context.stroke();
    }
    for (let spoke = 0; spoke < 14; spoke += 1) {
      const angle = (spoke / 14) * TAU;
      context.beginPath();
      context.moveTo(96 + Math.cos(angle) * 30, 96 + Math.sin(angle) * 30);
      context.lineTo(96 + Math.cos(angle + 0.08) * 86, 96 + Math.sin(angle + 0.08) * 86);
      context.strokeStyle = "rgba(255,226,150,0.26)";
      context.lineWidth = 2.4;
      context.stroke();
    }
    context.globalCompositeOperation = "source-over";
  });

  const spark = createCanvasTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,246,1)"],
      [0.2, "rgba(255,238,178,1)"],
      [0.48, "rgba(232,172,52,0.72)"],
      [1, "rgba(90,44,6,0)"],
    ]);
    context.globalCompositeOperation = "lighter";
    context.strokeStyle = "rgba(255,246,206,0.8)";
    context.lineWidth = 1.5;
    for (let arm = 0; arm < 3; arm += 1) {
      const angle = (arm / 3) * TAU;
      context.beginPath();
      context.moveTo(32 - Math.cos(angle) * 20, 32 - Math.sin(angle) * 20);
      context.lineTo(32 + Math.cos(angle) * 20, 32 + Math.sin(angle) * 20);
      context.stroke();
    }
    context.globalCompositeOperation = "source-over";
  });

  return { ironRail, runeBand, chargeCore, scorchRing, spark };
}

export function disposeChoqueVitalTextures(textures: ChoqueVitalTextureSet): void {
  textures.ironRail.dispose();
  textures.runeBand.dispose();
  textures.chargeCore.dispose();
  textures.scorchRing.dispose();
  textures.spark.dispose();
}
