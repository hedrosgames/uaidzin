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
    bronze.addColorStop(0, "#26183f");
    bronze.addColorStop(0.26, "#8855bf");
    bronze.addColorStop(0.48, "#d5b7fa");
    bronze.addColorStop(0.66, "#65428a");
    bronze.addColorStop(1, "#180d2a");
    context.fillStyle = bronze;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.55;
    context.strokeStyle = "#24103a";
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
    context.fillStyle = "#eee2ff";
    for (let index = 0; index < 20; index += 1) {
      const x = (index * 59) % 128;
      const y = (index * 83) % 128;
      context.fillRect(x, y, 2, 2);
    }
    context.globalAlpha = 1;
  });

  const chargeCore = createCanvasTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(238,232,255,1)"],
      [0.14, "rgba(212,178,255,0.9)"],
      [0.36, "rgba(150,86,240,0.62)"],
      [0.66, "rgba(94,26,168,0.18)"],
      [1, "rgba(34,6,70,0)"],
    ]);
  });

  const scorchRing = createCanvasTexture(192, 192, (context) => {
    context.clearRect(0, 0, 192, 192);
    context.globalCompositeOperation = "lighter";
    for (let ring = 0; ring < 3; ring += 1) {
      context.beginPath();
      context.arc(96, 96, 44 + ring * 20, 0, TAU);
      context.strokeStyle = `rgba(${186 - ring * 30},${110 - ring * 24},${250 - ring * 20},${0.44 - ring * 0.12})`;
      context.lineWidth = 8 - ring * 2;
      context.stroke();
    }
    for (let spoke = 0; spoke < 14; spoke += 1) {
      const angle = (spoke / 14) * TAU;
      context.beginPath();
      context.moveTo(96 + Math.cos(angle) * 30, 96 + Math.sin(angle) * 30);
      context.lineTo(96 + Math.cos(angle + 0.08) * 86, 96 + Math.sin(angle + 0.08) * 86);
      context.strokeStyle = "rgba(190,150,255,0.26)";
      context.lineWidth = 2.4;
      context.stroke();
    }
    context.globalCompositeOperation = "source-over";
  });

  const spark = createCanvasTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(244,240,255,1)"],
      [0.2, "rgba(218,178,255,1)"],
      [0.48, "rgba(152,72,232,0.72)"],
      [1, "rgba(44,6,90,0)"],
    ]);
    context.globalCompositeOperation = "lighter";
    context.strokeStyle = "rgba(226,206,255,0.8)";
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
