export type GraphicsQualityLevel = "baixo" | "medio" | "alto";

export interface QualityProfile {
  level: GraphicsQualityLevel;
  label: string;
  samples: number;
  bloom: boolean;
  bloomHalfRes: boolean;
  maxDpr: number;
  shadows: boolean;
  shadowMapSize: number;
  cheapShaders: boolean;
}

export const GRAPHICS_PRESETS: Record<GraphicsQualityLevel, QualityProfile> = {
  baixo: {
    level: "baixo",
    label: "Baixo",
    samples: 0,
    bloom: false,
    bloomHalfRes: true,
    maxDpr: 1,
    shadows: false,
    shadowMapSize: 512,
    cheapShaders: true,
  },
  medio: {
    level: "medio",
    label: "Médio",
    samples: 2,
    bloom: true,
    bloomHalfRes: true,
    maxDpr: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    cheapShaders: false,
  },
  alto: {
    level: "alto",
    label: "Alto",
    samples: 4,
    bloom: true,
    bloomHalfRes: true,
    maxDpr: 2,
    shadows: true,
    shadowMapSize: 2048,
    cheapShaders: false,
  },
};

export const DEFAULT_GRAPHICS_QUALITY: GraphicsQualityLevel = "medio";

let activeQuality: GraphicsQualityLevel = DEFAULT_GRAPHICS_QUALITY;

export function getActiveQuality(): GraphicsQualityLevel {
  return activeQuality;
}

export function setActiveQuality(quality: GraphicsQualityLevel): void {
  activeQuality = quality;
}

export function isCheapShaders(): boolean {
  return GRAPHICS_PRESETS[activeQuality].cheapShaders;
}

export function isGraphicsQualityLevel(val: unknown): val is GraphicsQualityLevel {
  return val === "baixo" || val === "medio" || val === "alto";
}
