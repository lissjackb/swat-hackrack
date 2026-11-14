// LP solver: pick items + servings from one meal that get closest to the
// meal's macro target, while NEVER violating dietary/allergen restrictions.
//
// Restrictions are HARD constraints — enforced by pre-filtering the item
// list, not by the LP. The LP then optimizes macros over what's left.
//
// This is a working starting point (maximize protein-adequacy while keeping
// calories in range). Tune the objective during the solver build; the
// restriction filter is the part that must never regress.
import solver from "javascript-lp-solver";
import type { MacroTargets, MenuItemDTO, Plate, PlateItem } from "./types";

const MAX_SERVINGS_PER_ITEM = 3;

// Dietary restriction -> required label present on the item.
const REQUIRES_LABEL: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  halal: "Halal",
  kosher: "Kosher",
  glutenFree: "Gluten Free",
};

/** Drop any item an allergen/diet restriction forbids. Hard filter. */
export function filterByRestrictions(
  items: MenuItemDTO[],
  restrictions: string[],
): MenuItemDTO[] {
  return items.filter((item) => {
    for (const r of restrictions) {
      const required = REQUIRES_LABEL[r];
      if (required) {
        // Diet restriction: item must carry the label.
        if (!item.dietary.includes(required)) return false;
      } else {
        // Treat anything else as an allergen to avoid (case-insensitive).
        const hit = item.allergens.some(
          (a) => a.toLowerCase() === r.toLowerCase(),
        );
        if (hit) return false;
      }
    }
    return true;
  });
}

/**
 * Recommend a plate for one meal.
 * @param items     candidate items for the meal (already this meal/day)
 * @param target    per-meal macro target
 * @param restrictions student's hard restrictions
 */
export function recommendPlate(
  items: MenuItemDTO[],
  target: MacroTargets,
  restrictions: string[] = [],
): Plate {
  const candidates = filterByRestrictions(items, restrictions);

  // Build LP: integer servings per item.
  // Objective (starting point): maximize protein, subject to a calorie
  // ceiling so we don't overshoot. TODO: switch to minimizing weighted
  // deviation across all four macros with auxiliary slack variables.
  const variables: Record<string, Record<string, number>> = {};
  const ints: Record<string, 1> = {};
  for (const item of candidates) {
    variables[item.id] = {
      protein: item.protein,
      calories: item.calories,
      carbs: item.carbs,
      fat: item.fat,
      servings: 1,
    };
    ints[item.id] = 1;
  }

  const model = {
    optimize: "protein",
    opType: "max" as const,
    constraints: {
      calories: { max: Math.round(target.calories * 1.1) },
      servings: { max: 6 }, // keep plates realistic
      ...Object.fromEntries(
        candidates.map((i) => [i.id, { max: MAX_SERVINGS_PER_ITEM }]),
      ),
    },
    variables,
    ints,
  };

  const result = solver.Solve(model) as Record<string, number> & {
    feasible: boolean;
  };

  const plateItems: PlateItem[] = [];
  const totals: MacroTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (result.feasible) {
    for (const item of candidates) {
      const servings = result[item.id];
      if (!servings || servings <= 0) continue;
      plateItems.push({ item, servings });
      totals.calories += item.calories * servings;
      totals.protein += item.protein * servings;
      totals.carbs += item.carbs * servings;
      totals.fat += item.fat * servings;
    }
  }

  return {
    items: plateItems,
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    target,
  };
}
