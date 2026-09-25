import rawRecipes from "./compose-recipes.json";

export type ComposeRecipeDef = {
  id: string;
  uiTitle: string;
  uiDesc: string;
  materialId: string;
  materialQty: number;
  goldCost: number;
  targetRefine: number;
  successChance: number;
  maxCurrentRefineExclusive: number;
};

export const COMPOSE_RECIPES: Record<string, ComposeRecipeDef> = {};

for (const recipe of (rawRecipes as ComposeRecipeDef[])) {
  COMPOSE_RECIPES[recipe.id] = recipe;
}

export function getComposeRecipe(id: string): ComposeRecipeDef | null {
  if (id in COMPOSE_RECIPES) return COMPOSE_RECIPES[id];
  return null;
}
