import { type Texture } from "three";
import {
  createCanvasTexture as createTexture,
  drawRadialGlow,
} from "../../vfxKit/canvasTexture";

export interface EscudoSagradoTextureSet {
  dome: Texture;
  glow: Texture;
  spark: Texture;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function drawRune(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
): void {
  context.beginPath();
  context.moveTo(x, y + height);
  context.lineTo(x, y);
  context.lineTo(x + height * 0.42, y + height * 0.38);
  context.lineTo(x, y + height * 0.76);
  context.moveTo(x - height * 0.24, y + height * 0.3);
  context.lineTo(x + height * 0.3, y + height * 0.3);
  context.stroke();
}

export function createEscudoSagradoTextures(): EscudoSagradoTextureSet {
  const dome = createTexture(256, 256, (context) => {
    const energy = context.createRadialGradient(128, 128, 12, 128, 128, 128);
    energy.addColorStop(0, "rgba(255,236,180,0.34)");
    energy.addColorStop(0.45, "rgba(212,160,23,0.2)");
    energy.addColorStop(0.82, "rgba(160,104,16,0.12)");
    energy.addColorStop(1, "rgba(60,36,8,0)");
    context.fillStyle = energy;
    context.fillRect(0, 0, 256, 256);
    const random = mulberry32(214);
    context.strokeStyle = "rgba(255,224,150,0.85)";
    context.lineWidth = 1.4;
    context.lineCap = "round";
    for (let index = 0; index < 14; index += 1) {
      const x = 22 + random() * 212;
      const y = 26 + random() * 196;
      const height = 12 + random() * 18;
      drawRune(context, x, y, height);
    }
    context.strokeStyle = "rgba(240,230,208,0.4)";
    context.lineWidth = 1;
    for (let index = 0; index < 5; index += 1) {
      const y = 40 + index * 44;
      context.beginPath();
      context.moveTo(10 + (index % 2) * 26, y);
      context.lineTo(246 - (index % 2) * 26, y + 12);
      context.stroke();
    }
  });

  const glow = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,246,214,1)"],
      [0.24, "rgba(240,214,130,0.9)"],
      [0.55, "rgba(212,160,23,0.5)"],
      [1, "rgba(96,62,10,0)"],
    ]);
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,252,238,1)"],
      [0.2, "rgba(255,222,140,1)"],
      [0.48, "rgba(226,166,50,0.78)"],
      [1, "rgba(120,74,10,0)"],
    ]);
  });

  return { dome, glow, spark };
}

export function disposeEscudoSagradoTextures(
  textures: EscudoSagradoTextureSet,
): void {
  textures.dome.dispose();
  textures.glow.dispose();
  textures.spark.dispose();
}
