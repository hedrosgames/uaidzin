import { type Texture } from "three";
import {
  createCanvasTexture as createTexture,
  drawRadialGlow,
} from "../../vfxKit/canvasTexture";

export interface MuralhaTextureSet {
  stone: Texture;
  dust: Texture;
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

export function createMuralhaTextures(): MuralhaTextureSet {
  const stone = createTexture(256, 256, (context) => {
    context.fillStyle = "#241c14";
    context.fillRect(0, 0, 256, 256);
    const random = mulberry32(7712);
    const cell = 32;
    for (let row = 0; row < 8; row += 1) {
      const offset = (row % 2) * cell * 0.5;
      for (let col = 0; col < 8; col += 1) {
        const x = col * cell - offset;
        const y = row * cell;
        const shade = 22 + random() * 34;
        context.fillStyle = `rgb(${Math.round(shade + 14)},${Math.round(shade + 8)},${Math.round(shade - 4)})`;
        context.fillRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
        const facet = context.createLinearGradient(x, y, x + cell, y + cell);
        facet.addColorStop(0, "rgba(240,230,208,0.14)");
        facet.addColorStop(0.5, "rgba(0,0,0,0)");
        facet.addColorStop(1, "rgba(0,0,0,0.32)");
        context.fillStyle = facet;
        context.fillRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      }
    }
    context.strokeStyle = "rgba(212,160,23,0.22)";
    context.lineWidth = 1;
    for (let index = 0; index < 10; index += 1) {
      const x = random() * 256;
      const y = random() * 256;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (random() - 0.5) * 26, y + (random() - 0.5) * 26);
      context.stroke();
    }
  });

  const dust = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(232,216,184,0.9)"],
      [0.35, "rgba(168,140,96,0.62)"],
      [0.7, "rgba(110,88,54,0.3)"],
      [1, "rgba(46,36,24,0)"],
    ]);
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,246,214,1)"],
      [0.22, "rgba(232,197,71,0.92)"],
      [0.55, "rgba(212,160,23,0.62)"],
      [1, "rgba(96,62,10,0)"],
    ]);
  });

  return { stone, dust, spark };
}

export function disposeMuralhaTextures(textures: MuralhaTextureSet): void {
  textures.stone.dispose();
  textures.dust.dispose();
  textures.spark.dispose();
}
