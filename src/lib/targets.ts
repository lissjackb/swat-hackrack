// Profile -> daily & per-meal macro targets.
// Mifflin-St Jeor BMR x activity factor, protein set in g/kg, fat as a
// % of calories, carbs as the remainder. Everything here is intentionally
// transparent so the UI can show the student exactly how we got the numbers.
import type {
  ActivityLevel,
  Goal,
  Meal,
  ProfileInput,
  Targets,
  WhoopSnapshot,
} from "./types";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

// Calorie adjustment vs. maintenance, and protein target, per goal.
const GOAL_CALORIE_MULT: Record<Goal, number> = {
  cut: 0.8,
  maintain: 1.0,
  build: 1.1,
  perform: 1.05,
};
const GOAL_PROTEIN_G_PER_KG: Record<Goal, number> = {
  cut: 2.2,
  maintain: 1.6,
  build: 2.0,
  perform: 1.8,
};

// Share of daily calories/macros per meal. Must sum to 1.
const MEAL_SPLIT: Record<Meal, number> = {
  breakfast: 0.3,
  lunch: 0.35,
  dinner: 0.35,
};

const FAT_CALORIE_SHARE = 0.27; // ~27% of calories from fat

function mifflinStJeor(p: ProfileInput): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

/**
 * Compute daily and per-meal targets for a profile.
 * Pass a Whoop snapshot to nudge the day (more carbs after high strain,
 * recovery-friendly on red recovery). See adjustForWhoop below.
 */
export function computeTargets(
  p: ProfileInput,
  whoop?: WhoopSnapshot,
): Targets {
  const bmr = mifflinStJeor(p);
  const activityFactor = ACTIVITY_FACTOR[p.activityLevel];
  const tdee = bmr * activityFactor;

  let calories = tdee * GOAL_CALORIE_MULT[p.goal];
  const proteinGPerKg = GOAL_PROTEIN_G_PER_KG[p.goal];
  let protein = proteinGPerKg * p.weightKg;
  let fat = (calories * FAT_CALORIE_SHARE) / 9;
  let note: string | undefined;

  if (whoop) {
    const adj = adjustForWhoop({ calories, protein, fat }, whoop);
    calories = adj.calories;
    protein = adj.protein;
    fat = adj.fat;
    note = adj.note;
  }

  // Carbs are the remainder: protein & carbs 4 cal/g, fat 9 cal/g.
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);

  const daily = {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };

  const perMeal = Object.fromEntries(
    (Object.keys(MEAL_SPLIT) as Meal[]).map((meal) => {
      const s = MEAL_SPLIT[meal];
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
    breakdown: { bmr: Math.round(bmr), tdee: Math.round(tdee), activityFactor, proteinGPerKg, note },
  };
}

/**
 * Whoop "thin slice": nudge today's macros based on recovery/strain.
 * Deliberately gentle. Tune these during the Whoop build.
 */
function adjustForWhoop(
  base: { calories: number; protein: number; fat: number },
  whoop: WhoopSnapshot,
): { calories: number; protein: number; fat: number; note: string } {
  let { calories, protein, fat } = base;
  const notes: string[] = [];

  // High strain -> fuel it: +~10% calories, carb-leaning (via lower fat share).
  if (whoop.strain >= 14) {
    calories *= 1.1;
    fat *= 0.95;
    notes.push(`high strain (${whoop.strain.toFixed(1)}) → more fuel, carb-leaning`);
  }
  // Red recovery -> protect recovery: a little more protein.
  if (whoop.recovery < 34) {
    protein *= 1.1;
    notes.push(`low recovery (${whoop.recovery}%) → extra protein`);
  }

  return {
    calories,
    protein,
    fat,
    note: notes.length
      ? `Whoop adjustment: ${notes.join("; ")}.`
      : "Whoop: green day, targets unchanged.",
  };
}
