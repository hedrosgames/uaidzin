import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const shopsPath = path.join(root, "src/data/balance/shops.json");
const itemsPath = path.join(root, "src/data/items/items.json");
const recipesPath = path.join(root, "src/data/composer/compose-recipes.json");

const shopsData = JSON.parse(fs.readFileSync(shopsPath, "utf-8"));
const itemsData = JSON.parse(fs.readFileSync(itemsPath, "utf-8"));
const recipesData = JSON.parse(fs.readFileSync(recipesPath, "utf-8"));

const itemsById = new Map();
if (Array.isArray(itemsData)) {
  for (const item of itemsData) {
    itemsById.set(item.id, item);
  }
} else if (itemsData && typeof itemsData === "object") {
  for (const [id, item] of Object.entries(itemsData)) {
    itemsById.set(id, { ...item, id });
  }
}

const errors = [];

const shops = shopsData.shops || shopsData;
for (const [shopId, shop] of Object.entries(shops)) {
  const slots = shop.slots || [];
  for (const slot of slots) {
    if ("qty" in slot) {
      errors.push(`Shop ${shopId}, item ${slot.itemId} possui 'qty' definido: ${slot.qty}`);
    }
    if (!Number.isFinite(slot.price) || slot.price < 0) {
      errors.push(`Shop ${shopId}, item ${slot.itemId} possui preco invalido: ${slot.price}`);
    }
    const item = itemsById.get(slot.itemId);
    if (!item) {
      errors.push(`Shop ${shopId}, item ${slot.itemId} nao encontrado em items.json`);
    } else {
      const sellValue = Number(item.sellValue) || 0;
      if (sellValue > slot.price) {
        errors.push(
          `Item ${slot.itemId} em ${shopId} tem sellValue (${sellValue}) maior que price (${slot.price})`,
        );
      }
    }
  }
}

if (Array.isArray(recipesData)) {
  for (const recipe of recipesData) {
    if (!Number.isFinite(recipe.goldCost) || recipe.goldCost < 0) {
      errors.push(`Receita ${recipe.id} possui goldCost invalido: ${recipe.goldCost}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`[check-shop-catalog] ${errors.length} erro(s) encontrado(s):`);
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log("[check-shop-catalog] Catalogo de lojas e receitas validado com sucesso.");
