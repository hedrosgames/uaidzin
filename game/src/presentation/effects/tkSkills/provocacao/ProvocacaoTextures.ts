import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface ProvocacaoTextureSet {
  ember: Texture;
  spark: Texture;
  halo: Texture;
}

export function createProvocacaoTextures(): ProvocacaoTextureSet {
  const ember = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,190,160,1)"],
      [0.2, "rgba(214,72,48,0.94)"],
      [0.48, "rgba(163,59,59,0.7)"],
      [0.76, "rgba(88,16,12,0.32)"],
      [1, "rgba(30,4,4,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.24;
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + 0.7;
      const x = 64 + Math.cos(angle) * 32;
      const y = 64 + Math.sin(angle) * 32;
      const glow = context.createRadialGradient(x, y, 0, x, y, 14);
      glow.addColorStop(0, "rgba(255,170,90,0.7)");
      glow.addColorStop(1, "rgba(120,26,14,0)");
      context.fillStyle = glow;
      context.fillRect(x - 14, y - 14, 28, 28);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const spark = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,236,196,1)"],
      [0.24, "rgba(232,197,71,0.9)"],
      [0.54, "rgba(163,59,59,0.6)"],
      [1, "rgba(60,8,6,0)"],
    ]);
  });

  const halo = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,206,170,1)"],
      [0.16, "rgba(226,78,52,0.95)"],
      [0.42, "rgba(163,59,59,0.68)"],
      [0.72, "rgba(70,12,10,0.26)"],
      [1, "rgba(24,4,4,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.strokeStyle = "rgba(232,197,71,0.78)";
    context.lineCap = "round";
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      context.lineWidth = index % 2 === 0 ? 3.2 : 1.8;
      context.beginPath();
      context.moveTo(64 + Math.cos(angle) * 16, 64 + Math.sin(angle) * 16);
      context.lineTo(64 + Math.cos(angle) * 52, 64 + Math.sin(angle) * 52);
      context.stroke();
    }
    const rim = context.createRadialGradient(64, 64, 46, 64, 64, 62);
    rim.addColorStop(0, "rgba(212,160,23,0)");
    rim.addColorStop(0.82, "rgba(212,160,23,0.34)");
    rim.addColorStop(1, "rgba(212,160,23,0)");
    context.fillStyle = rim;
    context.fillRect(0, 0, 128, 128);
    context.globalCompositeOperation = "source-over";
  });

  return { ember, spark, halo };
}

export function disposeProvocacaoTextures(textures: ProvocacaoTextureSet): void {
  textures.ember.dispose();
  textures.spark.dispose();
  textures.halo.dispose();
}
