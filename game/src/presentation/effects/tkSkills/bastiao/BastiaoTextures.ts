import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface BastiaoTextureSet {
  dust: Texture;
  spark: Texture;
  spectral: Texture;
  innerRing: Texture;
  outerRing: Texture;
}

const RUNE_COUNT = 10;

function drawNotchStroke(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  context.beginPath();
  context.moveTo(x - 6 * scale, y + 7 * scale);
  context.lineTo(x, y - 7 * scale);
  context.lineTo(x + 6 * scale, y + 7 * scale);
  context.moveTo(x - 4 * scale, y + 1 * scale);
  context.lineTo(x + 4 * scale, y + 1 * scale);
  context.stroke();
}

function drawSteelRunes(
  context: CanvasRenderingContext2D,
  center: number,
  ringRadius: number,
): void {
  context.save();
  context.lineCap = "round";
  context.shadowColor = "rgba(214,220,232,0.8)";
  context.shadowBlur = 6;
  for (let index = 0; index < RUNE_COUNT; index += 1) {
    const angle = (index / RUNE_COUNT) * Math.PI * 2;
    const x = center + Math.cos(angle) * ringRadius;
    const y = center + Math.sin(angle) * ringRadius;
    context.save();
    context.translate(x, y);
    context.rotate(angle + Math.PI / 2);
    context.strokeStyle = index % 3 === 0
      ? "rgba(212,160,23,0.95)"
      : "rgba(198,206,220,0.9)";
    context.lineWidth = index % 3 === 0 ? 3 : 2.4;
    drawNotchStroke(context, 0, 0, index % 3 === 0 ? 1.1 : 0.9);
    context.restore();
  }
  context.restore();
}

function drawSteelRingBand(
  context: CanvasRenderingContext2D,
  center: number,
  ringRadius: number,
): void {
  context.save();
  context.shadowColor = "rgba(180,190,205,0.85)";
  context.shadowBlur = 12;
  context.strokeStyle = "rgba(168,176,190,0.7)";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(center, center, ringRadius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(230,236,244,0.95)";
  context.lineWidth = 1.6;
  context.beginPath();
  context.arc(center, center, ringRadius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(163,59,59,0.62)";
  context.lineWidth = 2.6;
  context.beginPath();
  context.arc(center, center, ringRadius - 12, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function createSteelRingTexture(size: number, ringRadius: number): Texture {
  return createTexture(size, size, (context) => {
    const glow = context.createRadialGradient(
      size / 2,
      size / 2,
      ringRadius * 0.6,
      size / 2,
      size / 2,
      ringRadius * 1.32,
    );
    glow.addColorStop(0, "rgba(180,190,205,0)");
    glow.addColorStop(0.72, "rgba(180,190,205,0.16)");
    glow.addColorStop(0.9, "rgba(163,59,59,0.26)");
    glow.addColorStop(1, "rgba(180,190,205,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, size, size);
    drawSteelRingBand(context, size / 2, ringRadius);
    drawSteelRunes(context, size / 2, ringRadius);
  });
}

export function createBastiaoTextures(): BastiaoTextureSet {
  const dust = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(226,214,190,1)"],
      [0.26, "rgba(178,164,138,0.86)"],
      [0.58, "rgba(110,98,78,0.5)"],
      [1, "rgba(46,38,26,0)"],
    ]);
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,250,226,1)"],
      [0.2, "rgba(232,197,71,1)"],
      [0.52, "rgba(212,160,23,0.8)"],
      [0.84, "rgba(163,59,59,0.28)"],
      [1, "rgba(60,18,8,0)"],
    ]);
  });

  const spectral = createTexture(128, 64, (context) => {
    const length = context.createLinearGradient(0, 0, 128, 0);
    length.addColorStop(0, "rgba(150,164,190,0)");
    length.addColorStop(0.28, "rgba(198,208,226,0.8)");
    length.addColorStop(0.74, "rgba(240,244,252,0.96)");
    length.addColorStop(1, "rgba(255,250,226,0)");
    context.fillStyle = length;
    context.fillRect(0, 0, 128, 64);
    context.globalCompositeOperation = "screen";
    const vein = context.createLinearGradient(0, 0, 0, 64);
    vein.addColorStop(0, "rgba(212,160,23,0)");
    vein.addColorStop(0.5, "rgba(212,160,23,0.55)");
    vein.addColorStop(1, "rgba(212,160,23,0)");
    context.fillStyle = vein;
    context.fillRect(0, 0, 128, 64);
    context.globalCompositeOperation = "destination-in";
    const soft = context.createLinearGradient(0, 0, 0, 64);
    soft.addColorStop(0, "rgba(0,0,0,0)");
    soft.addColorStop(0.3, "rgba(0,0,0,0.85)");
    soft.addColorStop(0.5, "rgba(0,0,0,1)");
    soft.addColorStop(0.7, "rgba(0,0,0,0.85)");
    soft.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = soft;
    context.fillRect(0, 0, 128, 64);
    context.globalCompositeOperation = "source-over";
  });

  const innerRing = createSteelRingTexture(256, 92);
  const outerRing = createSteelRingTexture(320, 140);

  return { dust, spark, spectral, innerRing, outerRing };
}

export function disposeBastiaoTextures(textures: BastiaoTextureSet): void {
  textures.dust.dispose();
  textures.spark.dispose();
  textures.spectral.dispose();
  textures.innerRing.dispose();
  textures.outerRing.dispose();
}
