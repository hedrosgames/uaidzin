import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface LuzTextureSet {
  beam: Texture;
  glow: Texture;
  spark: Texture;
  flare: Texture;
}

export function createLuzTextures(): LuzTextureSet {
  const beam = createTexture(128, 128, (context) => {
    const falloff = context.createLinearGradient(0, 0, 128, 0);
    falloff.addColorStop(0, "rgba(255,246,216,0)");
    falloff.addColorStop(0.5, "rgba(255,246,216,1)");
    falloff.addColorStop(1, "rgba(255,246,216,0)");
    context.fillStyle = falloff;
    context.fillRect(0, 0, 128, 128);
    context.globalCompositeOperation = "destination-in";
    const lengthFade = context.createLinearGradient(0, 0, 0, 128);
    lengthFade.addColorStop(0, "rgba(0,0,0,0.3)");
    lengthFade.addColorStop(0.55, "rgba(0,0,0,0.82)");
    lengthFade.addColorStop(1, "rgba(0,0,0,1)");
    context.fillStyle = lengthFade;
    context.fillRect(0, 0, 128, 128);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.42;
    for (let index = 0; index < 6; index += 1) {
      const x = 24 + index * 16;
      const streak = context.createLinearGradient(x, 0, x, 128);
      streak.addColorStop(0, "rgba(255,240,190,0)");
      streak.addColorStop(0.5, "rgba(255,240,190,0.7)");
      streak.addColorStop(1, "rgba(255,240,190,0)");
      context.fillStyle = streak;
      context.fillRect(x - 2, 0, 4, 128);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });
  beam.name = "luz-beam-atlas";

  const glow = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,252,238,1)"],
      [0.22, "rgba(248,222,138,0.94)"],
      [0.55, "rgba(212,160,23,0.56)"],
      [1, "rgba(120,84,16,0)"],
    ]);
  });
  glow.name = "luz-glow-atlas";

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,248,1)"],
      [0.26, "rgba(255,238,178,0.9)"],
      [0.58, "rgba(212,160,23,0.55)"],
      [1, "rgba(96,66,12,0)"],
    ]);
  });
  spark.name = "luz-spark-atlas";

  const flare = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,255,246,1)"],
      [0.18, "rgba(255,244,200,0.95)"],
      [0.5, "rgba(228,180,72,0.5)"],
      [1, "rgba(110,78,14,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    for (const [width, alpha] of [[4, 0.85], [2, 0.7]] as const) {
      context.fillStyle = `rgba(255,248,214,${alpha})`;
      context.fillRect(64 - width / 2, 4, width, 120);
      context.fillRect(4, 64 - width / 2, 120, width);
    }
    context.globalCompositeOperation = "source-over";
  });
  flare.name = "luz-flare-atlas";

  return { beam, glow, spark, flare };
}

export function disposeLuzTextures(textures: LuzTextureSet): void {
  textures.beam.dispose();
  textures.glow.dispose();
  textures.spark.dispose();
  textures.flare.dispose();
}
