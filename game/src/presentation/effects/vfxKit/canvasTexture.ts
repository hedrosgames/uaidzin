import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

export function createCanvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponível para textura procedural");
  draw(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function drawRadialGlow(
  context: CanvasRenderingContext2D,
  center: number,
  radius: number,
  stops: Array<[number, string]>,
): void {
  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    radius,
  );
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, center * 2, center * 2);
}
