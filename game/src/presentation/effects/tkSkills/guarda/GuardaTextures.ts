import { type Texture } from "three";
import {
  createCanvasTexture as createTexture,
  drawRadialGlow,
} from "../../vfxKit/canvasTexture";

export interface GuardaTextureSet {
  shell: Texture;
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

export function createGuardaTextures(): GuardaTextureSet {
  const shell = createTexture(256, 256, (context) => {
    const iron = context.createRadialGradient(128, 128, 10, 128, 128, 128);
    iron.addColorStop(0, "rgba(212,160,23,0.32)");
    iron.addColorStop(0.38, "rgba(122,96,56,0.2)");
    iron.addColorStop(0.76, "rgba(64,50,34,0.12)");
    iron.addColorStop(1, "rgba(24,18,12,0)");
    context.fillStyle = iron;
    context.fillRect(0, 0, 256, 256);
    const random = mulberry32(733);
    context.lineCap = "round";
    for (let index = 0; index < 22; index += 1) {
      const x = random() * 256;
      const y = random() * 256;
      const length = 18 + random() * 54;
      const angle = (random() - 0.5) * 0.7 + Math.PI / 2;
      context.strokeStyle = random() > 0.72
        ? "rgba(212,160,23,0.5)"
        : "rgba(140,120,92,0.34)";
      context.lineWidth = 1 + random() * 1.6;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      context.stroke();
    }
    context.strokeStyle = "rgba(212,160,23,0.24)";
    context.lineWidth = 1;
    for (let index = 0; index < 6; index += 1) {
      const y = 28 + index * 40;
      context.beginPath();
      context.moveTo(12 + (index % 2) * 20, y);
      context.lineTo(244 - (index % 2) * 20, y + 10);
      context.stroke();
    }
  });

  const glow = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(240,230,208,1)"],
      [0.26, "rgba(212,160,23,0.82)"],
      [0.58, "rgba(110,84,30,0.4)"],
      [1, "rgba(36,28,20,0)"],
    ]);
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,244,214,1)"],
      [0.22, "rgba(226,170,52,0.95)"],
      [0.5, "rgba(163,59,59,0.6)"],
      [1, "rgba(60,22,16,0)"],
    ]);
  });

  return { shell, glow, spark };
}

export function disposeGuardaTextures(textures: GuardaTextureSet): void {
  textures.shell.dispose();
  textures.glow.dispose();
  textures.spark.dispose();
}
