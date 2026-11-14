// Targets, ported from the mockup (lines 455–473, 675–677), plus the Whoop
// adjustment rule (PLANNER_SPEC "Whoop" — CHANGE: replaces the mockup's flat
// +150 and the old backend adjustForWhoop).
import { GOALS } from "./data";
import { has, type PlanContext, type PlannerProfile, type WhoopSnapshotLike } from "./context";

/** Mockup AF rows: [max training days, factor, label]. */
export const AF: [number, number, string][] = [
  [1, 1.375, 'lightly active — walking campus'],
  [3, 1.465, 'moderately active'],
  [5, 1.55, 'active'],
  [7, 1.725, 'very active'],
];

/** Server activity enum → the SAME factors as the mockup's day bins
 * (createProfile: ≤1 light, ≤3 moderate, ≤5 active, else veryActive).
 * sedentary stays 1.2; only API-created profiles use it. */
export const AF_BY_LEVEL: Record<string, [number, string]> = {
  sedentary: [1.2, 'sedentary'],
  light: [1.375, 'lightly active — walking campus'],
  moderate: [1.465, 'moderately active'],
  active: [1.55, 'active'],
  veryActive: [1.725, 'very active'],
};

export const SURPLUS: Record<string, number> = { build: 350, perform: 150, maintain: 0 };

// ---- Whoop adjustment thresholds (one place, PLANNER_SPEC table) ----------
export const WHOOP = {
  STRAIN_MED: 10,      // strain < 10 → +0 kcal
  STRAIN_HIGH: 14,     // strain ≥ 14 → +150 kcal (the mockup's number)
  KCAL_MED: 100,       // strain 10–13.9 → +100 kcal
  KCAL_HIGH: 150,
  RECOVERY_RED: 34,    // recovery < 34 → protein × 1.1
  RECOVERY_GREEN: 67,  // ≥ 67 green / 34–66 yellow (Fuel ring bands)
  PROTEIN_RED_MULT: 1.1,
  /** Guardrail: goal adj + Whoop adj capped at +500 kcal over TDEE (CLAUDE.md). */
  CAP_OVER_TDEE: 500,
} as const;

export interface WhoopAdjustment {
  /** Added kcal (goes to carbs automatically — fat is from base, protein fixed). */
  kcal: number;
  /** Protein multiplier (1.1 on red recovery, else 1). */
  proteinMult: number;
  note: string;
}

/**
 * One adjustment rule from the REAL numbers (replaces the flat +150):
 *   strain < 10 → +0 · 10–13.9 → +100 · ≥14 → +150 kcal;
 *   recovery < 34 (red) → protein × 1.1.
 * `goalAdj` is the goal's calorie adjustment, so the +500-over-TDEE cap can
 * be applied to goal + Whoop together.
 */
export function whoopAdjustment(snapshot: WhoopSnapshotLike, goalAdj = 0): WhoopAdjustment {
  let kcal = 0;
  if (snapshot.strain >= WHOOP.STRAIN_HIGH) kcal = WHOOP.KCAL_HIGH;
  else if (snapshot.strain >= WHOOP.STRAIN_MED) kcal = WHOOP.KCAL_MED;
  // Cap: goal adjustment + Whoop adjustment ≤ +500 kcal over TDEE.
  // (Build: +350 + 150 = 500, exactly the mockup's number.)
  kcal = Math.min(kcal, Math.max(0, WHOOP.CAP_OVER_TDEE - Math.max(0, Math.round(goalAdj))));
  const red = snapshot.recovery < WHOOP.RECOVERY_RED;
  const proteinMult = red ? WHOOP.PROTEIN_RED_MULT : 1;
  const bits: string[] = [];
  if (kcal > 0) bits.push(`strain ${snapshot.strain} → +${kcal} kcal, carb-leaning`);
  if (red) bits.push(`recovery ${snapshot.recovery}% → recovery-focused plate (protein ×1.1)`);
  return { kcal, proteinMult, note: bits.length ? `Whoop: ${bits.join('; ')}` : 'Whoop: green day, no change' };
}

/** The planner's targets shape (mockup `targets()` return, + devNote). */
export interface PlannerTargets {
  bmr: number;
  af: number;
  afLabel: string;
  tdee: number;
  adj: number;
  adjNote: string;
  floor: number;
  floored: boolean;
  base: number;
  /** Whoop-added kcal for today (0 when not connected / no permission). */
  dev: number;
  devNote?: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  kg: number;
}

/** kg/cm from whichever unit set the profile carries. The client converts
 * with the mockup's formula (lb*0.4536, (ft*12+in)*2.54) without rounding;
 * DB-stored values are already metric (rounded — allow ±10 kcal). */
function units(p: PlannerProfile): { kg: number; cm: number } {
  const kg = p.weightKg ?? (+(p.lb ?? 0)) * 0.4536;
  const cm = p.heightCm ?? ((+(p.ft ?? 0)) * 12 + (+(p.inch ?? 0))) * 2.54;
  return { kg, cm };
}

function activity(p: PlannerProfile): { af: number; afLabel: string } {
  // The planner uses p.days if it's set, otherwise the enum.
  if (p.days != null) {
    const row = AF.find(r => (p.days as number) <= r[0]) || AF[3];
    return { af: row[1], afLabel: row[2] };
  }
  const [af, afLabel] = AF_BY_LEVEL[p.activityLevel ?? 'moderate'] ?? AF_BY_LEVEL.moderate;
  return { af, afLabel };
}

/** Mockup `targets()` with the Whoop rule swapped in (the only CHANGE). */
export function targets(ctx: PlanContext): PlannerTargets {
  const p = ctx.p;
  const { kg, cm } = units(p);
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const { af, afLabel } = activity(p);
  const tdee = bmr * af;
  const g = GOALS[p.goal];
  let adj: number, adjNote: string;
  if (p.goal === 'cut') {
    const d = Math.min(0.2 * tdee, 500);
    adj = -d; adjNote = d >= 500 ? 'deficit capped at 500 kcal' : '20% of maintenance';
  } else {
    const want = SURPLUS[p.goal] || 0;
    adj = Math.min(want, 0.15 * tdee);
    adjNote = want ? (adj < want ? 'surplus capped at 15% of maintenance' : 'surplus') : 'no change';
  }
  const floor = Math.max(bmr, p.sex === 'female' ? 1200 : 1500);
  let base = tdee + adj; const floored = base < floor; if (floored) base = floor;
  base = Math.round(base / 10) * 10;

  // CHANGE: Whoop adjustment from the real snapshot, not a flat +150.
  // Applies only when connected and the recovery permission is on.
  let dev = 0, devNote: string | undefined, proteinMult = 1;
  if (ctx.whoop && has(ctx, 'recovery')) {
    const w = whoopAdjustment(ctx.whoop, adj);
    dev = w.kcal; proteinMult = w.proteinMult; devNote = w.note;
  }

  const kcal = base + dev;
  const pr = Math.round(Math.round(kg * g.pk) * proteinMult);
  const f = Math.round(base * 0.27 / 9);
  const c = Math.round((kcal - pr * 4 - f * 9) / 4);
  return {
    bmr: Math.round(bmr), af, afLabel, tdee: Math.round(tdee / 10) * 10,
    adj: Math.round(adj), adjNote, floor: Math.round(floor), floored,
    base, dev, devNote, kcal, p: pr, c, f, kg,
  };
}

export const RANGE: Record<string, [number, number]> = {
  cut: [0.9, 1.05], maintain: [0.9, 1.1], build: [0.9, 1.2], perform: [0.9, 1.15],
};

export function rangeK(goal: string, T: PlannerTargets): [number, number] {
  const r = RANGE[goal] || [0.9, 1.1];
  return [Math.round(T.kcal * r[0] / 10) * 10, Math.round(T.kcal * r[1] / 10) * 10];
}
