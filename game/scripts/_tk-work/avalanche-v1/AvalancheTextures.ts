import { type Texture } from "three";
import { createCanvasTexture as createTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";

export interface AvalancheTextureSet {
  dust: Texture;
  debris: Texture;
}

export function createAvalancheTextures(): AvalancheTextureSet {
  const dust = createTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(226,208,176,0.94)"],
      [0.3, "rgba(178,154,118,0.8)"],
      [0.62, "rgba(112,92,66,0.42)"],
      [1, "rgba(58,46,32,0)"],
    ]);
    context.globalAlpha = 0.32;
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const x = 64 + Math.cos(angle) * (28 + (index % 3) * 9);
      const y = 64 + Math.sin(angle) * (28 + (index % 4) * 7);
      const puff = context.createRadialGradient(x, y, 0, x, y, 17);
      puff.addColorStop(0, "rgba(232,216,186,0.72)");
      puff.addColorStop(1, "rgba(118,96,68,0)");
      context.fillStyle = puff;
      context.fillRect(x - 17, y - 17, 34, 34);
    }
    context.globalAlpha = 1;
  });

  const debris = createTexture(64, 64, (context) => {
    context.translate(32, 32);
    context.rotate(0.42);
    const rock = context.createLinearGradient(-18, -18, 18, 18);
    rock.addColorStop(0, "#93815e");
    rock.addColorStop(0.45, "#5d4d38");
    rock.addColorStop(1, "#2e241a");
    context.fillStyle = rock;
    context.beginPath();
    context.moveTo(-16, -10);
    context.lineTo(-4, -18);
    context.lineTo(12, -12);
    context.lineTo(18, 2);
    context.lineTo(8, 16);
    context.lineTo(-10, 14);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(240,230,208,0.32)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "rgba(20,14,8,0.5)";
    context.beginPath();
    context.moveTo(-8, -2);
    context.lineTo(2, -6);
    context.lineTo(6, 4);
    context.lineTo(-4, 8);
    context.closePath();
    context.fill();
  });

  return { dust, debris };
}

export function disposeAvalancheTextures(textures: AvalancheTextureSet): void {
  textures.dust.dispose();
  textures.debris.dispose();
}
