import { type Texture } from "three";
import { createCanvasTexture as createTexture } from "../../vfxKit/canvasTexture";

export interface AvalancheTextureSet {
  dust: Texture;
  debris: Texture;
}

export function createAvalancheTextures(): AvalancheTextureSet {
  const dust = createTexture(128, 128, (context) => {
    for (let index = 0; index < 7; index += 1) {
      const angle = index * Math.PI * 2 / 7;
      const x = 64 + Math.cos(angle) * 22;
      const y = 67 + Math.sin(angle) * 17;
      const radius = 23 + index % 3 * 4;
      const puff = context.createRadialGradient(x - 5, y - 7, 3, x, y, radius);
      puff.addColorStop(0, "rgba(217,193,151,0.78)");
      puff.addColorStop(0.62, "rgba(172,143,104,0.66)");
      puff.addColorStop(0.86, "rgba(126,103,77,0.34)");
      puff.addColorStop(1, "rgba(96,77,55,0)");
      context.fillStyle = puff;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
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
