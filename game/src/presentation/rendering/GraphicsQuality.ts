export type GraphicsQualityLevel = "baixo" | "medio" | "alto";

export interface QualityProfile {
  level: GraphicsQualityLevel;
  label: string;
  samples: number;
  bloom: boolean;
  bloomHalfRes: boolean;
  useComposer: boolean;
  maxDpr: number;
  shadows: boolean;
  shadowMapSize: number;
  shadowUpdateInterval: number;
  shadowHalfExtent: number;
  anisotropy: number;
  grassScale: number;
  maxPointLights: number;
  vfxScale: number;
  vfxTurbulence: boolean;
  vfxLights: boolean;
  cheapShaders: boolean;
}

export const GRAPHICS_PRESETS: Record<GraphicsQualityLevel, QualityProfile> = {
  baixo: {
    level: "baixo",
    label: "Baixo",
    samples: 0,
    bloom: false,
    bloomHalfRes: true,
    useComposer: false,
    maxDpr: 1,
    shadows: false,
    shadowMapSize: 512,
    shadowUpdateInterval: 0.4,
    shadowHalfExtent: 10,
    anisotropy: 1,
    grassScale: 0.35,
    maxPointLights: 1,
    vfxScale: 0.35,
    vfxTurbulence: false,
    vfxLights: false,
    cheapShaders: false,
  },
  medio: {
    level: "medio",
    label: "Médio",
    samples: 0,
    bloom: true,
    bloomHalfRes: true,
    useComposer: true,
    maxDpr: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    shadowUpdateInterval: 1 / 30,
    shadowHalfExtent: 12,
    anisotropy: 4,
    grassScale: 0.65,
    maxPointLights: 2,
    vfxScale: 0.6,
    vfxTurbulence: true,
    vfxLights: false,
    cheapShaders: false,
  },
  alto: {
    level: "alto",
    label: "Alto",
    samples: 0,
    bloom: true,
    bloomHalfRes: true,
    useComposer: true,
    maxDpr: 2,
    shadows: true,
    shadowMapSize: 2048,
    shadowUpdateInterval: 1 / 60,
    shadowHalfExtent: 14,
    anisotropy: 8,
    grassScale: 1,
    maxPointLights: 8,
    vfxScale: 1,
    vfxTurbulence: true,
    vfxLights: true,
    cheapShaders: false,
  },
};

export const DEFAULT_GRAPHICS_QUALITY: GraphicsQualityLevel = "medio";

let activeQuality: GraphicsQualityLevel = DEFAULT_GRAPHICS_QUALITY;

export function getActiveQuality(): GraphicsQualityLevel {
  return activeQuality;
}

export function getActiveProfile(): QualityProfile {
  return GRAPHICS_PRESETS[activeQuality];
}

export function setActiveQuality(quality: GraphicsQualityLevel): void {
  activeQuality = quality;
}

export function isCheapShaders(): boolean {
  return GRAPHICS_PRESETS[activeQuality].cheapShaders;
}

export function textureAnisotropy(): number {
  return GRAPHICS_PRESETS[activeQuality].anisotropy;
}

export function stampAnisotropy(texture: { anisotropy: number } | null | undefined): void {
  if (texture) texture.anisotropy = textureAnisotropy();
}

export function grassCount(full: number): number {
  if (full <= 0) return 0;
  return Math.max(1, Math.floor(full * GRAPHICS_PRESETS[activeQuality].grassScale));
}

export function isGraphicsQualityLevel(val: unknown): val is GraphicsQualityLevel {
  return val === "baixo" || val === "medio" || val === "alto";
}
