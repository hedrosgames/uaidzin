export type ComposeRecipeId = "compose_plus7_lac";

export type ComposeRecipeDef = {
  id: ComposeRecipeId;
  uiTitle: string;
  uiDesc: string;
  materialId: string;
  materialQty: number;
  goldCost: number;
  targetRefine: number;
  successChance: number;
  maxCurrentRefineExclusive: number;
};

export const COMPOSE_RECIPES: Record<ComposeRecipeId, ComposeRecipeDef> = {
  compose_plus7_lac: {
    id: "compose_plus7_lac",
    uiTitle: "+7",
    uiDesc: "Poeira de Lac + 1.000.000 Ouro. Chance de 50%.",
    materialId: "mat_lac",
    materialQty: 1,
    goldCost: 1_000_000,
    targetRefine: 7,
    successChance: 0.5,
    maxCurrentRefineExclusive: 7,
  },
};

export function getComposeRecipe(id: string): ComposeRecipeDef | null {
  if (id in COMPOSE_RECIPES) return COMPOSE_RECIPES[id as ComposeRecipeId];
  return null;
}
