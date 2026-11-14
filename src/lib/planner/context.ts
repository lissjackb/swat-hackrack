// PlanContext replaces the mockup's global `S` (PLANNER_SPEC "Globals →
// explicit inputs"). Every planner function reads from an explicit, immutable
// context instead of module state. The planner NEVER mutates ctx — the React
// store creates a new state object per action, and the server builds one per
// request.
import type { Goal, Sex, ActivityLevel, ProfileInput } from "../types";

/** Macro totals in the planner's compact shape. */
export interface MacroSum {
  k: number;
  p: number;
  c: number;
  f: number;
}

/**
 * The profile as the planner sees it. Two unit paths, one result
 * (PLANNER_SPEC "Targets"): the client fills lb/ft/inch/days (mockup parity);
 * the server fills weightKg/heightCm/activityLevel from the DB row.
 */
export interface PlannerProfile {
  name?: string;
  goal: Goal;
  sex: Sex;
  age: number;
  // Client units (mockup):
  lb?: number | string;
  ft?: number | string;
  inch?: number | string;
  days?: number | null;
  // Server units (DB):
  weightKg?: number;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  restrictions: string[];
  /** CHANGE (PLANNER_SPEC): derived from restrictions.includes('halal'). */
  halal?: boolean;
  snack?: boolean;
  fifth?: boolean;
  never?: string[];
  sport?: string | null;
}

export interface WhoopSnapshotLike {
  recovery: number;
  strain: number;
  mock?: boolean;
  source?: string;
}

/** A locked meal (mockup S.locked[mealId]). */
export interface MealLock {
  parts?: { name: string; m: number; orig?: number; added?: boolean; from?: string }[];
  removed?: string[];
  mults?: Record<string, number>;
  orig?: Record<string, number>;
}

export interface PlanContext {
  p: PlannerProfile;
  device: string | null;
  perms: Record<string, boolean>;
  whoop: WhoopSnapshotLike | null;
  seed: Record<string, number>;
  swaps: Record<string, string>;
  itemSwaps: Record<string, Record<string, { name: string; m: number }>>;
  adds: Record<string, { name: string; m: number }[]>;
  ate: Record<string, string[]>;
  done: Record<string, unknown>;
  locked: Record<string, MealLock>;
  /** flex[mealId] = the estimated macros the user logged for that flex meal. */
  flex: Record<string, MacroSum>;
  extras: (MacroSum & { name?: string })[];
  now: { day: string; mins: number; label?: string };
}

/** Mockup line 777: `has(k)` — device connected AND the permission is on. */
export const has = (ctx: PlanContext, k: string): boolean =>
  !!ctx.device && !!(ctx.perms && ctx.perms[k]);

import { NOW } from "./data";

/** Fill every missing ctx field with the mockup DEFAULT()'s empty shape. */
export function normalizeContext(
  partial: Partial<PlanContext> & { p: PlannerProfile },
): PlanContext {
  const p = partial.p;
  return {
    p: {
      snack: true,
      fifth: true,
      never: [],
      ...p,
      // CHANGE (PLANNER_SPEC bug fix): halal rides in restrictions.
      halal: p.halal ?? (p.restrictions || []).includes("halal"),
    },
    device: partial.device ?? null,
    perms: partial.perms ?? { recovery: true },
    whoop: partial.whoop ?? null,
    seed: partial.seed ?? {},
    swaps: partial.swaps ?? {},
    itemSwaps: partial.itemSwaps ?? {},
    adds: partial.adds ?? {},
    ate: partial.ate ?? {},
    done: partial.done ?? {},
    locked: partial.locked ?? {},
    flex: partial.flex ?? {},
    extras: partial.extras ?? [],
    now: partial.now ?? NOW,
  };
}

/** Server-side adapter: a DB/API ProfileInput row → PlannerProfile. */
export function profileFromInput(input: ProfileInput): PlannerProfile {
  return {
    name: input.name,
    goal: input.goal,
    sex: input.sex,
    age: input.age,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    activityLevel: input.activityLevel,
    restrictions: input.restrictions ?? [],
    halal: (input.restrictions ?? []).includes("halal"),
    snack: true,
    fifth: true,
    never: [],
  };
}
