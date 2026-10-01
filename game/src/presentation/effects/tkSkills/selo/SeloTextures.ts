import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface SeloTextureSet {
  dust: Texture;
  glyph: Texture;
  innerRing: Texture;
  outerRing: Texture;
}

const GLYPH_COUNT = 12;

function drawRuneStroke(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  context.beginPath();
  context.moveTo(x - 5 * scale, y - 9 * scale);
  context.lineTo(x + 5 * scale, y - 9 * scale);
  context.moveTo(x, y - 9 * scale);
  context.lineTo(x, y + 9 * scale);
  context.moveTo(x - 5 * scale, y + 2 * scale);
  context.lineTo(x + 5 * scale, y + 9 * scale);
  context.stroke();
}

function drawRunes(
  context: CanvasRenderingContext2D,
  center: number,
  ringRadius: number,
): void {
  context.save();
  context.lineCap = "round";
  context.shadowColor = "rgba(205,126,255,0.9)";
  context.shadowBlur = 7;
  for (let index = 0; index < GLYPH_COUNT; index += 1) {
    const angle = (index / GLYPH_COUNT) * Math.PI * 2;
    const x = center + Math.cos(angle) * ringRadius;
    const y = center + Math.sin(angle) * ringRadius;
    context.save();
    context.translate(x, y);
    context.rotate(angle + Math.PI / 2);
    context.strokeStyle = index % 3 === 0 ? "rgba(255,220,255,0.98)" : "rgba(218,158,255,0.94)";
    context.lineWidth = index % 3 === 0 ? 3.4 : 2.6;
    drawRuneStroke(context, 0, 0, index % 3 === 0 ? 1.15 : 0.92);
    context.restore();
  }
  context.restore();
}

function drawRingBand(
  context: CanvasRenderingContext2D,
  center: number,
  ringRadius: number,
): void {
  context.save();
  context.shadowColor = "rgba(174,76,255,0.92)";
  context.shadowBlur = 14;
  context.strokeStyle = "rgba(174,76,255,0.76)";
  context.lineWidth = 4.5;
  context.beginPath();
  context.arc(center, center, ringRadius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(255,205,250,0.96)";
  context.lineWidth = 1.7;
  context.beginPath();
  context.arc(center, center, ringRadius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(104,42,180,0.62)";
  context.lineWidth = 2.4;
  context.beginPath();
  context.arc(center, center, ringRadius - 13, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function createRingTexture(size: number, ringRadius: number): Texture {
  return createTexture(size, size, (context) => {
    const glow = context.createRadialGradient(size / 2, size / 2, ringRadius * 0.62, size / 2, size / 2, ringRadius * 1.3);
    glow.addColorStop(0, "rgba(120,40,220,0)");
    glow.addColorStop(0.74, "rgba(174,76,255,0.22)");
    glow.addColorStop(0.9, "rgba(236,84,205,0.28)");
    glow.addColorStop(1, "rgba(120,40,220,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, size, size);
    drawRingBand(context, size / 2, ringRadius);
    drawRunes(context, size / 2, ringRadius);
  });
}

export function createSeloTextures(): SeloTextureSet {
  const dust = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,226,255,1)"],
      [0.24, "rgba(220,140,255,0.92)"],
      [0.56, "rgba(174,76,255,0.6)"],
      [1, "rgba(40,8,68,0)"],
    ]);
  });

  const glyph = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 30, [
      [0, "rgba(255,205,250,0.62)"],
      [0.5, "rgba(174,76,255,0.28)"],
      [1, "rgba(40,8,68,0)"],
    ]);
    context.strokeStyle = "rgba(255,220,255,1)";
    context.lineWidth = 3.2;
    context.lineCap = "round";
    context.shadowColor = "rgba(205,126,255,0.96)";
    context.shadowBlur = 6;
    drawRuneStroke(context, 32, 32, 1.35);
  });

  const innerRing = createRingTexture(256, 92);
  const outerRing = createRingTexture(320, 140);

  return { dust, glyph, innerRing, outerRing };
}

export function disposeSeloTextures(textures: SeloTextureSet): void {
  textures.dust.dispose();
  textures.glyph.dispose();
  textures.innerRing.dispose();
  textures.outerRing.dispose();
}
