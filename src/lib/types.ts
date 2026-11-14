// Shared types used across API routes, lib, and the UI.
// Keep this as the single source of truth for shapes that cross the
// front-end / back-end boundary so Harlan and Liss stay in sync.

export type Goal = "build" | "maintain" | "cut" | "perform";
export type Sex = "male" | "female";
export type Meal = "breakfast" | "lunch" | "dinner";
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

export interface Targets {
  daily: MacroTargets;
  perMeal: Record<Meal, MacroTargets>;
  /** How the numbers were derived, for the transparent breakdown in the UI. */
  breakdown: {
    bmr: number;
    tdee: number;
    activityFactor: number;
    proteinGPerKg: number;
    note?: string; // e.g. Whoop adjustment explanation
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
