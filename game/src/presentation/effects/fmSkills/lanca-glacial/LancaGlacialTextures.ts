import { createCanvasTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";
import type { Texture } from "three";

const TAU = Math.PI * 2;

export interface LancaGlacialTextureSet {
  iceBlade: Texture;
  iceFissure: Texture;
  ironSocket: Texture;
  coldCore: Texture;
  fracture: Texture;
  frostDecal: Texture;
  glint: Texture;
}

export function createLancaGlacialTextures(): LancaGlacialTextureSet {
  const iceBlade = createCanvasTexture(128, 128, (context) => {
    const glacier = context.createLinearGradient(0, 0, 0, 128);
    glacier.addColorStop(0, "#5c8fa8");
    glacier.addColorStop(0.24, "#b9dcec");
    glacier.addColorStop(0.46, "#e6f4fb");
    glacier.addColorStop(0.64, "#9cc4d8");
    glacier.addColorStop(0.86, "#4d7d96");
    glacier.addColorStop(1, "#22404f");
    context.fillStyle = glacier;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.3;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.4;
    for (let band = 0; band < 22; band += 1) {
      const y = (band * 23) % 128;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(38, y - 9, 84, y + 11, 128, y - 4);
      context.stroke();
    }
    context.globalAlpha = 0.22;
    context.fillStyle = "#2b5468";
    for (let index = 0; index < 60; index += 1) {
      const x = (index * 53) % 128;
      const y = (index * 91) % 128;
      context.beginPath();
      context.ellipse(x, y, 3 + (index % 3), 1.4, 0.5, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  });

  const iceFissure = createCanvasTexture(128, 128, (context) => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 128, 128);
    context.lineCap = "round";
    for (let crack = 0; crack < 10; crack += 1) {
      let x = (crack * 47) % 128;
      let y = (crack * 29) % 128;
      context.beginPath();
      context.moveTo(x, y);
      for (let step = 0; step < 5; step += 1) {
        x += Math.cos(crack * 2.1 + step * 1.3) * 14;
        y += Math.sin(crack * 1.7 + step * 1.1) * 14;
        context.lineTo(x, y);
      }
      context.strokeStyle = crack % 2 === 0 ? "#dff2ff" : "#8fc4dd";
      context.lineWidth = 1.5 - (crack % 3) * 0.3;
      context.stroke();
    }
  });

  const ironSocket = createCanvasTexture(128, 128, (context) => {
    const iron = context.createLinearGradient(0, 0, 0, 128);
    iron.addColorStop(0, "#12100e");
    iron.addColorStop(0.22, "#332c25");
    iron.addColorStop(0.44, "#5c5148");
    iron.addColorStop(0.58, "#2a241f");
    iron.addColorStop(0.8, "#4a4038");
    iron.addColorStop(1, "#0e0c0a");
    context.fillStyle = iron;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.36;
    context.strokeStyle = "#d4a017";
    context.lineWidth = 2.4;
    for (let offset = -128; offset < 256; offset += 26) {
      context.beginPath();
      context.moveTo(offset, 128);
      context.lineTo(offset + 128, 0);
      context.stroke();
    }
    context.globalAlpha = 0.5;
    context.fillStyle = "#0a0806";
    for (let index = 0; index < 26; index += 1) {
      const x = (index * 41) % 128;
      const y = (index * 67) % 128;
      context.beginPath();
      context.arc(x, y, 2 + (index % 3), 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  });

  const coldCore = createCanvasTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(248,253,255,1)"],
      [0.16, "rgba(214,240,252,0.96)"],
      [0.4, "rgba(143,196,221,0.74)"],
      [0.7, "rgba(60,110,140,0.28)"],
      [1, "rgba(18,42,58,0)"],
    ]);
  });

  const fracture = createCanvasTexture(192, 192, (context) => {
    context.clearRect(0, 0, 192, 192);
    context.lineCap = "round";
    for (let shard = 0; shard < 26; shard += 1) {
      const angle = (shard / 26) * TAU + 0.2;
      const inner = 22 + (shard % 4) * 6;
      const outer = 74 + (shard % 5) * 9;
      context.beginPath();
      context.moveTo(96 + Math.cos(angle) * inner, 96 + Math.sin(angle) * inner);
      context.lineTo(96 + Math.cos(angle + 0.1) * outer, 96 + Math.sin(angle + 0.1) * outer);
      context.strokeStyle = `rgba(${206 + (shard % 3) * 14},${234 + (shard % 2) * 16},250,${0.62 - (shard % 4) * 0.1})`;
      context.lineWidth = 3.2 - (shard % 3) * 0.8;
      context.stroke();
    }
    for (let ring = 0; ring < 3; ring += 1) {
      context.beginPath();
      context.arc(96, 96, 46 + ring * 16, 0, TAU);
      context.strokeStyle = `rgba(190,226,244,${0.34 - ring * 0.09})`;
      context.lineWidth = 5 - ring;
      context.stroke();
    }
  });

  const frostDecal = createCanvasTexture(192, 192, (context) => {
    context.clearRect(0, 0, 192, 192);
    const cold = context.createRadialGradient(96, 96, 0, 96, 96, 92);
    cold.addColorStop(0, "rgba(226,244,252,0.52)");
    cold.addColorStop(0.42, "rgba(168,210,230,0.28)");
    cold.addColorStop(0.78, "rgba(96,150,178,0.1)");
    cold.addColorStop(1, "rgba(40,80,104,0)");
    context.fillStyle = cold;
    context.beginPath();
    context.arc(96, 96, 92, 0, TAU);
    context.fill();
    context.strokeStyle = "rgba(226,244,252,0.44)";
    context.lineWidth = 2.2;
    for (let needle = 0; needle < 18; needle += 1) {
      const angle = (needle / 18) * TAU;
      context.beginPath();
      context.moveTo(96 + Math.cos(angle) * 26, 96 + Math.sin(angle) * 26);
      context.lineTo(96 + Math.cos(angle + 0.06) * (58 + (needle % 3) * 12), 96 + Math.sin(angle + 0.06) * (58 + (needle % 3) * 12));
      context.stroke();
    }
  });

  const glint = createCanvasTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,255,1)"],
      [0.2, "rgba(222,243,252,1)"],
      [0.48, "rgba(143,196,221,0.7)"],
      [1, "rgba(30,68,90,0)"],
    ]);
    context.globalCompositeOperation = "lighter";
    context.strokeStyle = "rgba(255,255,255,0.75)";
    context.lineWidth = 1.6;
    for (let arm = 0; arm < 4; arm += 1) {
      const angle = (arm / 4) * TAU;
      context.beginPath();
      context.moveTo(32 - Math.cos(angle) * 22, 32 - Math.sin(angle) * 22);
      context.lineTo(32 + Math.cos(angle) * 22, 32 + Math.sin(angle) * 22);
      context.stroke();
    }
    context.globalCompositeOperation = "source-over";
  });

  return { iceBlade, iceFissure, ironSocket, coldCore, fracture, frostDecal, glint };
}

export function disposeLancaGlacialTextures(textures: LancaGlacialTextureSet): void {
  textures.iceBlade.dispose();
  textures.iceFissure.dispose();
  textures.ironSocket.dispose();
  textures.coldCore.dispose();
  textures.fracture.dispose();
  textures.frostDecal.dispose();
  textures.glint.dispose();
}
