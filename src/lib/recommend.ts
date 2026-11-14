// Plate recommendation — now a thin wrapper over the shared planner
// (src/lib/planner/), which replaced the LP solver (docs/PLANNER_SPEC.md:
// the LP planned one meal in isolation, allowed any 4 items, and its
// restriction filter had bugs). `conflict()` is the hard filter everywhere.
//
// @deprecated Prefer POST /api/plan (whole-day planning). recommendPlate
// stays for /api/recommend compatibility and test tooling: it ranks ONE
// meal's realistic plates (main + carb + side) against the given target.
// Servings can be fractional, in 0.5 steps.
import { MACROS, type MacroTargets, type MenuItemDTO, type Plate, type PlateItem } from "./types";
import { conflict } from "./planner/restrictions";
import { rowToPlannerItem, type PlannerItem } from "./planner/items";
import { rankItems } from "./planner/plan";
import type { PlannerProfile } from "./planner/context";

/** A restrictions[] array → the minimal profile conflict() reads. */
export function profileFromRestrictions(restrictions: string[]): PlannerProfile {
  const r = restrictions.map((x) => String(x).toLowerCase());
  return {
    goal: "maintain",
    sex: "male",
    age: 20,
    restrictions: r,
    halal: r.includes("halal"),
    never: [],
  };
}

/**
 * Drop any item an allergen/diet restriction forbids. Hard filter — kept as
 * a wrapper over the planner's conflict() so existing callers (test-solver)
 * still compile. Fixes the LP filter's bugs: vegetarian keeps vegan-labeled
 * items, halal applies to meat only, pescatarian works, items with NO
 * allergen data are excluded for anyone with an allergy (fail closed), and
 * a gluten allergy excludes wheat.
 */
export function filterByRestrictions(
  items: MenuItemDTO[],
  restrictions: string[],
): MenuItemDTO[] {
  const p = profileFromRestrictions(restrictions);
  return items.filter((dto) => {
    const it = toPlannerItem(dto);
    return it !== null && !conflict(it, p);
  });
}

/** DTO → PlannerItem (null when it has no macros and no built-in estimate). */
function toPlannerItem(dto: MenuItemDTO): PlannerItem | null {
  return rowToPlannerItem({
    id: dto.id,
    date: dto.date,
    meal: dto.meal,
    station: dto.station,
    name: dto.name,
    calories: dto.calories,
    protein: dto.protein,
    carbs: dto.carbs,
    fat: dto.fat,
    dietary: dto.dietary,
    allergens: dto.allergens,
  });
}

/**
 * Recommend a plate for one meal (deprecated — see header).
 * @param items     candidate items for the meal (already this meal/day)
 * @param target    per-meal macro target
 * @param restrictions student's hard restrictions
 */
export function recommendPlate(
  items: MenuItemDTO[],
  target: MacroTargets,
  restrictions: string[] = [],
): Plate {
  const p = profileFromRestrictions(restrictions);
  const byId = new Map<string, MenuItemDTO>();
  const eligible: PlannerItem[] = [];
  const seen = new Set<string>();
  for (const dto of items) {
    const it = toPlannerItem(dto);
    if (!it || conflict(it, p)) continue;
    if (seen.has(it.name)) continue; // same dish at two stations
    seen.add(it.name);
    byId.set(it.name, dto);
    eligible.push(it);
  }

  // Meal kind drives the plate template (breakfast/brunch lead with fruit
  // sides; everything else is a standard meal).
  const meal = items[0]?.meal as string | undefined;
  const kind = meal === "breakfast" || meal === "brunch" ? "breakfast" : "meal";

  const ranked = rankItems(kind, eligible, { k: target.calories, p: target.protein });
  const top = ranked[0];

  const plateItems: PlateItem[] = (top?.parts ?? []).map((pp) => ({
    item: byId.get(pp.it.name)!,
    servings: pp.m,
  }));

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
