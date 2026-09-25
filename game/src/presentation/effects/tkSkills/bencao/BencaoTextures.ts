import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface BencaoTextureSet {
  glow: Texture;
  mote: Texture;
}

export function createBencaoTextures(): BencaoTextureSet {
  const glow = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,246,220,1)"],
      [0.2, "rgba(244,206,96,0.95)"],
      [0.48, "rgba(212,160,23,0.7)"],
      [0.74, "rgba(163,59,59,0.28)"],
      [1, "rgba(60,22,10,0)"],
    ]);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.18;
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + 0.9;
      const x = 64 + Math.cos(angle) * 26;
      const y = 64 + Math.sin(angle) * 26;
      const halo = context.createRadialGradient(x, y, 0, x, y, 14);
      halo.addColorStop(0, "rgba(255,232,160,0.7)");
      halo.addColorStop(1, "rgba(120,80,20,0)");
      context.fillStyle = halo;
      context.fillRect(x - 14, y - 14, 28, 28);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const mote = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,250,230,1)"],
      [0.24, "rgba(248,214,110,0.94)"],
      [0.55, "rgba(212,160,23,0.6)"],
      [1, "rgba(80,50,12,0)"],
    ]);
  });

  return { glow, mote };
}

export function disposeBencaoTextures(textures: BencaoTextureSet): void {
  textures.glow.dispose();
  textures.mote.dispose();
}
