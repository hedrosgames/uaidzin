import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface RugidoTextureSet {
  streak: Texture;
  puff: Texture;
  ember: Texture;
}

export function createRugidoTextures(): RugidoTextureSet {
  const streak = createTexture(128, 64, (context) => {
    const glow = context.createRadialGradient(64, 32, 0, 64, 32, 62);
    glow.addColorStop(0, "rgba(240,219,255,1)");
    glow.addColorStop(0.24, "rgba(194,151,224,0.96)");
    glow.addColorStop(0.55, "rgba(123,75,167,0.55)");
    glow.addColorStop(1, "rgba(45,25,64,0)");
    context.save();
    context.translate(64, 32);
    context.scale(1, 0.24);
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 62, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });

  const puff = createTexture(128, 128, (context) => {
    const blobs: Array<[number, number, number, string]> = [
      [64, 70, 46, "rgba(168,148,118,0.85)"],
      [44, 58, 30, "rgba(196,176,142,0.7)"],
      [86, 56, 28, "rgba(150,130,102,0.66)"],
      [66, 44, 24, "rgba(214,196,160,0.6)"],
      [92, 84, 22, "rgba(120,102,78,0.55)"],
    ];
    for (const [x, y, radius, color] of blobs) {
      const blob = context.createRadialGradient(x, y, 0, x, y, radius);
      blob.addColorStop(0, color);
      blob.addColorStop(1, "rgba(88,74,56,0)");
      context.fillStyle = blob;
      context.fillRect(0, 0, 128, 128);
    }
    const shell = context.createRadialGradient(64, 64, 8, 64, 64, 62);
    shell.addColorStop(0, "rgba(216,200,168,0)");
    shell.addColorStop(0.72, "rgba(216,200,168,0.18)");
    shell.addColorStop(1, "rgba(216,200,168,0)");
    context.fillStyle = shell;
    context.fillRect(0, 0, 128, 128);
  });

  const ember = createTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(236,215,255,1)"],
      [0.22, "rgba(185,133,217,1)"],
      [0.5, "rgba(108,58,151,0.82)"],
      [1, "rgba(38,17,58,0)"],
    ]);
  });

  return { streak, puff, ember };
}

export function disposeRugidoTextures(textures: RugidoTextureSet): void {
  textures.streak.dispose();
  textures.puff.dispose();
  textures.ember.dispose();
}
