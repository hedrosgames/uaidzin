import { type Texture } from "three";
import {
  createCanvasTexture as createTexture,
  createGlowTexture,
} from "../../vfxKit/canvasTexture";

export interface CorteTextureSet {
  blade: Texture;
  spark: Texture;
}

export function createCorteTextures(): CorteTextureSet {
  const blade = createTexture(256, 64, (context) => {
    const core = context.createLinearGradient(0, 0, 0, 64);
    core.addColorStop(0, "rgba(212,160,23,0)");
    core.addColorStop(0.16, "rgba(240,230,208,0.32)");
    core.addColorStop(0.4, "rgba(255,250,232,0.96)");
    core.addColorStop(0.5, "rgba(255,255,255,1)");
    core.addColorStop(0.6, "rgba(255,244,214,0.96)");
    core.addColorStop(0.84, "rgba(212,160,23,0.28)");
    core.addColorStop(1, "rgba(163,59,59,0)");
    context.fillStyle = core;
    context.fillRect(0, 0, 256, 64);
    context.globalCompositeOperation = "destination-in";
    const length = context.createLinearGradient(0, 0, 256, 0);
    length.addColorStop(0, "rgba(0,0,0,0)");
    length.addColorStop(0.1, "rgba(0,0,0,0.92)");
    length.addColorStop(0.86, "rgba(0,0,0,1)");
    length.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = length;
    context.fillRect(0, 0, 256, 64);
    context.globalCompositeOperation = "source-over";
  });

  const spark = createGlowTexture(64, [
    [0, "rgba(255,255,248,1)"],
    [0.22, "rgba(240,230,208,0.9)"],
    [0.52, "rgba(212,160,23,0.62)"],
    [1, "rgba(90,74,56,0)"],
  ]);

  return { blade, spark };
}

export function disposeCorteTextures(textures: CorteTextureSet): void {
  textures.blade.dispose();
  textures.spark.dispose();
}
