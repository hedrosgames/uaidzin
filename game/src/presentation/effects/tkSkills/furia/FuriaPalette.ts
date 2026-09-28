import { Color } from "three";
import { Vector3 as QuarksVector3, Vector4 as QuarksVector4 } from "three.quarks";

export interface FuriaPalette {
  ringColor: Color;
  lightColor: number;
  emberStops: [number, string][];
  sparkStops: [number, string][];
  gradientColors: [QuarksVector3, number][];
  startColor: QuarksVector4;
  burstStartColor: QuarksVector4;
  ringSparkStartColor: QuarksVector4;
}

export const DEFAULT_FURIA_PALETTE: FuriaPalette = {
  ringColor: new Color(0.88, 0.16, 0.1),
  lightColor: 0xd63a20,
  emberStops: [
    [0, "rgba(255,214,170,1)"],
    [0.18, "rgba(255,122,64,0.96)"],
    [0.44, "rgba(214,58,32,0.72)"],
    [0.72, "rgba(122,18,10,0.34)"],
    [1, "rgba(40,6,4,0)"],
  ],
  sparkStops: [
    [0, "rgba(255,238,214,1)"],
    [0.22, "rgba(255,140,72,0.92)"],
    [0.52, "rgba(196,52,26,0.62)"],
    [1, "rgba(70,10,6,0)"],
  ],
  gradientColors: [
    [new QuarksVector3(1, 0.62, 0.32), 0],
    [new QuarksVector3(0.96, 0.28, 0.12), 0.38],
    [new QuarksVector3(0.64, 0.1, 0.05), 0.74],
    [new QuarksVector3(0.16, 0.02, 0.01), 1],
  ],
  startColor: new QuarksVector4(1, 0.42, 0.2, 0.78),
  burstStartColor: new QuarksVector4(1, 0.62, 0.34, 0.9),
  ringSparkStartColor: new QuarksVector4(1, 0.5, 0.24, 0.88),
};

export const DESCUIDADO_PALETTE: FuriaPalette = {
  ringColor: new Color(0.72, 0.52, 0.28),
  lightColor: 0xb88640,
  emberStops: [
    [0, "rgba(235,220,195,1)"],
    [0.18, "rgba(190,145,95,0.96)"],
    [0.44, "rgba(130,105,75,0.72)"],
    [0.72, "rgba(90,80,70,0.34)"],
    [1, "rgba(40,35,30,0)"],
  ],
  sparkStops: [
    [0, "rgba(235,225,210,1)"],
    [0.22, "rgba(185,150,110,0.92)"],
    [0.52, "rgba(120,105,90,0.62)"],
    [1, "rgba(50,45,40,0)"],
  ],
  gradientColors: [
    [new QuarksVector3(0.85, 0.68, 0.45), 0],
    [new QuarksVector3(0.65, 0.52, 0.35), 0.38],
    [new QuarksVector3(0.45, 0.4, 0.35), 0.74],
    [new QuarksVector3(0.2, 0.18, 0.16), 1],
  ],
  startColor: new QuarksVector4(0.8, 0.65, 0.45, 0.78),
  burstStartColor: new QuarksVector4(0.85, 0.7, 0.5, 0.9),
  ringSparkStartColor: new QuarksVector4(0.75, 0.65, 0.5, 0.88),
};
