import { createCanvasTexture, drawRadialGlow } from "../../vfxKit/canvasTexture";
import type { Texture } from "three";

export interface EsferaIgneaTextureSet {
  coreSurface: Texture;
  coreFissure: Texture;
  shellBand: Texture;
  hotCore: Texture;
  scorch: Texture;
  ember: Texture;
}

export function createEsferaIgneaTextures(): EsferaIgneaTextureSet {
  const coreSurface = createCanvasTexture(128, 128, (context) => {
    const basalt = context.createLinearGradient(0, 0, 0, 128);
    basalt.addColorStop(0, "#150d0a");
    basalt.addColorStop(0.3, "#2b1a12");
    basalt.addColorStop(0.55, "#4a2c1a");
    basalt.addColorStop(0.78, "#1d120e");
    basalt.addColorStop(1, "#0e0806");
    context.fillStyle = basalt;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.5;
    for (let index = 0; index < 90; index += 1) {
      const x = (index * 61) % 128;
      const y = (index * 97) % 128;
      const size = 2 + (index % 4);
      context.fillStyle = index % 3 === 0 ? "#6b4326" : "#0a0605";
      context.fillRect(x, y, size, size * 0.7);
    }
    context.globalAlpha = 1;
  });

  const coreFissure = createCanvasTexture(128, 128, (context) => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 128, 128);
    context.lineCap = "round";
    for (let vein = 0; vein < 9; vein += 1) {
      const startX = (vein * 43) % 128;
      const startY = (vein * 71) % 128;
      const segments = 4 + (vein % 3);
      let x = startX;
      let y = startY;
      context.beginPath();
      context.moveTo(x, y);
      for (let step = 0; step < segments; step += 1) {
        x += Math.cos(vein * 1.9 + step * 1.1) * 15;
        y += Math.sin(vein * 2.4 + step * 1.3) * 15;
        context.lineTo(x, y);
      }
      context.strokeStyle = vein % 3 === 0 ? "#ffb347" : "#d2550c";
      context.lineWidth = 1.6 - (vein % 3) * 0.35;
      context.stroke();
    }
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.3;
    for (let vein = 0; vein < 9; vein += 1) {
      const startX = (vein * 43) % 128;
      const startY = (vein * 71) % 128;
      const glow = context.createRadialGradient(startX, startY, 0, startX, startY, 15);
      glow.addColorStop(0, "rgba(255,110,26,0.42)");
      glow.addColorStop(1, "rgba(255,90,10,0)");
      context.fillStyle = glow;
      context.fillRect(startX - 15, startY - 15, 30, 30);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  });

  const shellBand = createCanvasTexture(128, 128, (context) => {
    const bronze = context.createLinearGradient(0, 0, 0, 128);
    bronze.addColorStop(0, "#3a2a18");
    bronze.addColorStop(0.24, "#8a6534");
    bronze.addColorStop(0.46, "#d4a017");
    bronze.addColorStop(0.62, "#6b4a22");
    bronze.addColorStop(0.84, "#2a1d12");
    bronze.addColorStop(1, "#140e09");
    context.fillStyle = bronze;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = 0.32;
    context.strokeStyle = "#ffe9a8";
    context.lineWidth = 2;
    for (let offset = -128; offset < 256; offset += 17) {
      context.beginPath();
      context.moveTo(offset, 128);
      context.lineTo(offset + 128, 0);
      context.stroke();
    }
    context.globalAlpha = 0.4;
    context.fillStyle = "#a33b3b";
    for (let index = 0; index < 11; index += 1) {
      const x = (index * 31) % 128;
      const y = (index * 59) % 128;
      context.beginPath();
      context.ellipse(x, y, 4, 2, -0.6, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  });

  const hotCore = createCanvasTexture(128, 128, (context) => {
    drawRadialGlow(context, 64, 64, [
      [0, "rgba(255,255,236,1)"],
      [0.18, "rgba(255,242,117,0.98)"],
      [0.42, "rgba(255,138,26,0.82)"],
      [0.72, "rgba(198,58,10,0.34)"],
      [1, "rgba(80,14,4,0)"],
    ]);
  });

  const scorch = createCanvasTexture(192, 192, (context) => {
    context.clearRect(0, 0, 192, 192);
    context.globalCompositeOperation = "lighter";
    for (let ring = 0; ring < 4; ring += 1) {
      const radius = 40 + ring * 17;
      context.beginPath();
      context.arc(96, 96, radius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(${255 - ring * 40},${140 - ring * 34},${40 - ring * 8},${0.5 - ring * 0.1})`;
      context.lineWidth = 9 - ring * 1.6;
      context.stroke();
    }
    const inner = context.createRadialGradient(96, 96, 0, 96, 96, 52);
    inner.addColorStop(0, "rgba(255,196,96,0.5)");
    inner.addColorStop(0.6, "rgba(214,86,20,0.2)");
    inner.addColorStop(1, "rgba(120,30,6,0)");
    context.fillStyle = inner;
    context.beginPath();
    context.arc(96, 96, 52, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "source-over";
  });

  const ember = createCanvasTexture(64, 64, (context) => {
    drawRadialGlow(context, 32, 32, [
      [0, "rgba(255,255,242,1)"],
      [0.22, "rgba(255,236,124,1)"],
      [0.5, "rgba(255,122,26,0.72)"],
      [1, "rgba(150,30,4,0)"],
    ]);
  });

  return { coreSurface, coreFissure, shellBand, hotCore, scorch, ember };
}

export function disposeEsferaIgneaTextures(textures: EsferaIgneaTextureSet): void {
  textures.coreSurface.dispose();
  textures.coreFissure.dispose();
  textures.shellBand.dispose();
  textures.hotCore.dispose();
  textures.scorch.dispose();
  textures.ember.dispose();
}
