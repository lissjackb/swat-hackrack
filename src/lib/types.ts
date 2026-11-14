// Shared types used across API routes, lib, and the UI.
// Keep this as the single source of truth for shapes that cross the
// front-end / back-end boundary so Harlan and Liss stay in sync.

export type Goal = "build" | "maintain" | "cut" | "perform";
export type Sex = "male" | "female";
export type Meal = "breakfast" | "lunch" | "dinner";
/** Every meal value scripts/scrape.ts writes to the DB. `Meal` stays narrow
 * because Targets.perMeal is a Record<Meal, …>; the planner and the newer
 * routes use DbMeal (PLANNER_SPEC "Meal slots"). */
export type DbMeal = Meal | "brunch" | "latenight" | "snack";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";

/** Onboarding inputs (mirrors Profile columns, minus db fields). */
export interface ProfileInput {
  name: string;
  goal: Goal;
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  restrictions: string[]; // e.g. ["vegan", "peanut"]
}

/** Calorie + macro targets (grams), daily and per-meal. */
export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** The four macro keys, in order. Single source for iterating MacroTargets. */
export const MACROS = ["calories", "protein", "carbs", "fat"] as const;

export interface Targets {
  daily: MacroTargets;
  perMeal: Record<Meal, MacroTargets>;
  /** How the numbers were derived, for the transparent breakdown in the UI
   * (the How-we-got-it screen reads all of it — PLANNER_SPEC "Targets"). */
  breakdown: {
    bmr: number;
    tdee: number;
    activityFactor: number;
    proteinGPerKg: number;
    note?: string; // e.g. Whoop adjustment explanation
    /** Goal calorie adjustment vs. maintenance (kcal, signed). */
    adj?: number;
    adjNote?: string;
    /** Safety floor (max of BMR and 1200 F / 1500 M) and whether it applied. */
    floor?: number;
    floored?: boolean;
    /** Calories before the Whoop adjustment (rounded to 10). */
    base?: number;
    /** Whoop-added kcal for the day. */
    dev?: number;
    afLabel?: string;
  };
}

/** A menu item as the UI / solver consume it (nutrition per serving). */
export interface MenuItemDTO {
  id: string;
  date: string;
  meal: Meal;
  station: string | null;
  name: string;
  servingSize: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary: string[];
  allergens: string[];
}

/** One line of a recommended plate: an item and how many servings. */
export interface PlateItem {
  item: MenuItemDTO;
  servings: number;
}

export interface Plate {
  items: PlateItem[];
  totals: MacroTargets;
  target: MacroTargets;
  /** Claude-written "why this plate" note (1-2 sentences). */
  note?: string;
}

export interface WhoopSnapshot {
  recovery: number; // 0-100
  strain: number; // 0-21
  mock: boolean;
}
