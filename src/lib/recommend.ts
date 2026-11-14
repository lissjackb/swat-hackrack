// LP solver: pick items + servings from one meal that get closest to the
// meal's macro target, while NEVER violating dietary/allergen restrictions.
//
// Restrictions are HARD constraints — enforced by pre-filtering the item
// list, not by the LP. The LP then optimizes macros over what's left.
//
// Objective: minimize the weighted RELATIVE deviation from the meal's four
// macro targets (calories + protein weighted hardest; carbs + fat lighter),
// so plates HIT targets instead of maxing one macro. Modeled with per-macro
// over/under slack variables: `actual_m - over_m + under_m = target_m`.
//
// Two-stage solve (jsLPSolver's integer branch-and-bound hangs past ~12
// items, so we don't use it):
//   1. CONTINUOUS LP relaxation over all eligible items — pure simplex, fast
//      and reliable, with a ≤2-servings cap per item. Gives fractional
//      servings; its optimal basis activates only a handful of items.
//   2. Brute-force the best INTEGER plate (0..2 servings each, ≤4 distinct
//      items) over just that small active set. Exact and ~instant.
import solver from "javascript-lp-solver";
import { MACROS, type MacroTargets, type MenuItemDTO, type Plate, type PlateItem } from "./types";

const MAX_SERVINGS_PER_ITEM = 2; // realistic portion cap (skill: ≤2 each)
const MAX_DISTINCT_ITEMS = 4; // keep plates simple (skill: ≤4 items)
const ACTIVE_SET = 10; // items carried into the integer brute force

// Relative importance per macro. Calories + protein are the demo's pass
// criteria (within 10%); carbs + fat matter but shouldn't dominate.
const MACRO_IMPORTANCE = { calories: 1, protein: 1.2, carbs: 0.3, fat: 0.3 };

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

/** Weighted relative deviation of macro totals from the targets. */
function deviationOf(totals: MacroTargets, target: MacroTargets): number {
  return MACROS.reduce(
    (acc, m) => acc + (MACRO_IMPORTANCE[m] * Math.abs(totals[m] - target[m])) / (target[m] || 1),
    0,
  );
}

/**
 * Stage 1 — continuous LP relaxation. Returns fractional servings per item id.
 * No integer vars, so jsLPSolver runs plain simplex (fast, never hangs).
 */
function relaxedServings(
  items: MenuItemDTO[],
  target: MacroTargets,
): Record<string, number> {
  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {};

  for (const item of items) {
    const cap = `cap_${item.id}`;
    variables[item.id] = {
      bal_calories: item.calories,
      bal_protein: item.protein,
      bal_carbs: item.carbs,
      bal_fat: item.fat,
      [cap]: 1,
    };
    constraints[cap] = { max: MAX_SERVINGS_PER_ITEM };
  }
  for (const m of MACROS) {
    constraints[`bal_${m}`] = { equal: Math.max(0, Math.round(target[m])) };
    const w = MACRO_IMPORTANCE[m] / (target[m] || 1);
    variables[`over_${m}`] = { [`bal_${m}`]: -1, dev: w };
    variables[`under_${m}`] = { [`bal_${m}`]: 1, dev: w };
  }

  const result = solver.Solve({
    optimize: "dev",
    opType: "min" as const,
    constraints,
    variables,
  }) as Record<string, number> & { feasible: boolean };

  return result.feasible ? result : {};
}

/**
 * Stage 2 — exhaustively pick the best integer plate over a small active set:
 * 0..MAX_SERVINGS_PER_ITEM servings each, at most MAX_DISTINCT_ITEMS items,
 * minimizing weighted deviation. active.length ≤ ACTIVE_SET keeps this tiny.
 */
function bestIntegerPlate(
  active: MenuItemDTO[],
  target: MacroTargets,
): { item: MenuItemDTO; servings: number }[] {
  const n = active.length;
  const combo = new Array<number>(n).fill(0);
  let bestCombo: number[] | null = null;
  let bestDev = deviationOf({ calories: 0, protein: 0, carbs: 0, fat: 0 }, target);
  const calCeiling = target.calories * 1.4; // prune hopeless-overshoot branches

  // Running macro totals are threaded through the recursion (not rebuilt per
  // leaf), so each leaf is O(1) macros instead of O(items) — this is the
  // /api/recommend hot path.
  const recurse = (
    idx: number,
    used: number,
    cal: number,
    protein: number,
    carbs: number,
    fat: number,
  ) => {
    if (used > MAX_DISTINCT_ITEMS || cal > calCeiling) return; // prune
    if (idx === n) {
      const d = deviationOf({ calories: cal, protein, carbs, fat }, target);
      if (d < bestDev) {
        bestDev = d;
        bestCombo = combo.slice();
      }
      return;
    }
    const it = active[idx];
    for (let s = 0; s <= MAX_SERVINGS_PER_ITEM; s++) {
      combo[idx] = s;
      recurse(
        idx + 1,
        used + (s > 0 ? 1 : 0),
        cal + it.calories * s,
        protein + it.protein * s,
        carbs + it.carbs * s,
        fat + it.fat * s,
      );
    }
    combo[idx] = 0;
  };
  recurse(0, 0, 0, 0, 0, 0);

  if (!bestCombo) return [];
  return active
    .map((item, i) => ({ item, servings: bestCombo![i] }))
    .filter((p) => p.servings > 0);
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
  // Hard filter first; then drop 0-calorie items (no USDA match / water-type)
  // so they can't be used as "free" filler that fools the calorie balance.
  const eligible = filterByRestrictions(items, restrictions).filter(
    (i) => i.calories > 0,
  );

  // Stage 1: continuous LP, then take the items it leaned on most, UNION the
  // most protein-dense items. The LP can under-surface high-protein picks
  // (they overshoot calories fractionally), yet protein is the hardest target
  // to hit — so guarantee the brute force always gets to consider them.
  const relaxed = relaxedServings(eligible, target);
  const byLp = eligible
    .filter((i) => (relaxed[i.id] ?? 0) > 0.05)
    .sort((a, b) => (relaxed[b.id] ?? 0) - (relaxed[a.id] ?? 0));
  const byProtein = [...eligible].sort((a, b) => b.protein - a.protein);
  const active: MenuItemDTO[] = [];
  const seen = new Set<string>();
  for (const i of [...byLp, ...byProtein]) {
    if (active.length >= ACTIVE_SET) break;
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    active.push(i);
  }

  // Stage 2: exact integer plate over that small set.
  const plateItems: PlateItem[] = bestIntegerPlate(active, target);

  const totals: MacroTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const { item, servings } of plateItems) {
    for (const m of MACROS) totals[m] += item[m] * servings;
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
