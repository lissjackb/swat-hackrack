// Profile -> daily & per-meal macro targets.
// Thin wrapper over src/lib/planner/targets.ts (PLANNER_SPEC "Targets: one
// formula, matching the mockup"). Keeps the computeTargets signature and the
// Targets shape because /api/targets, /api/progress and test-solver use them.
//
// The mockup rules (now the single formula, client and server):
//   Mifflin-St Jeor BMR × activity factor → TDEE.
//   Cut −min(20% TDEE, 500) · Build +min(350, 15% TDEE) ·
//   Perform +min(150, 15% TDEE) · Maintain +0.
//   Floor at max(BMR, 1200 F / 1500 M), round to 10.
//   Fat 27% of base · protein g/kg per goal · carbs the remainder.
//   Whoop: strain/recovery adjustment (planner/targets.ts whoopAdjustment),
//   capped with the goal adjustment at +500 kcal over TDEE.
import type { ProfileInput, Targets, WhoopSnapshot, Meal } from "./types";
import { GOALS, MEALS } from "./planner/data";
import { profileFromInput, normalizeContext } from "./planner/context";
import { targets as plannerTargets } from "./planner/targets";

/** perMeal shares: the Saturday MEALS shares (sat-b .26, sat-l .32, sat-d
 * .32), normalized over those three (PLANNER_SPEC). */
const SAT_SHARES: Record<Meal, number> = (() => {
  const ids: Record<string, Meal> = { "sat-b": "breakfast", "sat-l": "lunch", "sat-d": "dinner" };
  const rows = MEALS.filter((m) => ids[m.id]);
  const tot = rows.reduce((a, m) => a + m.share, 0);
  return Object.fromEntries(rows.map((m) => [ids[m.id], m.share / tot])) as Record<Meal, number>;
})();

/**
 * Compute daily and per-meal targets for a profile. Pass a Whoop snapshot to
 * adjust the day from the REAL numbers (more carbs after high strain, more
 * protein on red recovery). Same function the planner uses, so /api/progress
 * and /api/plan always agree with the screen.
 */
export function computeTargets(
  p: ProfileInput,
  whoop?: WhoopSnapshot,
): Targets {
  const ctx = normalizeContext({
    p: profileFromInput(p),
    device: whoop ? "whoop" : null,
    perms: { recovery: true },
    whoop: whoop ?? null,
  });
  const T = plannerTargets(ctx);

  const daily = { calories: T.kcal, protein: T.p, carbs: T.c, fat: T.f };
  const perMeal = Object.fromEntries(
    (Object.keys(SAT_SHARES) as Meal[]).map((meal) => {
      const s = SAT_SHARES[meal];
      return [
        meal,
        {
          calories: Math.round(daily.calories * s),
          protein: Math.round(daily.protein * s),
          carbs: Math.round(daily.carbs * s),
          fat: Math.round(daily.fat * s),
        },
      ];
    }),
  ) as Targets["perMeal"];

  return {
    daily,
    perMeal,
    breakdown: {
      bmr: T.bmr,
      tdee: T.tdee,
      activityFactor: T.af,
      proteinGPerKg: GOALS[p.goal].pk,
      note: T.devNote,
      adj: T.adj,
      adjNote: T.adjNote,
      floor: T.floor,
      floored: T.floored,
      base: T.base,
      dev: T.dev,
      afLabel: T.afLabel,
    },
  };
}
