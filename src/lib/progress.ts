// Progress math: eaten macros vs. targets, for the daily bars and week view.
// Pure functions — the /api/progress route fetches the rows and calls these.
import { MACROS, type MacroTargets } from "./types";
import { localYmd } from "./date";

export interface DayProgress {
  date: string;
  eaten: MacroTargets;
  target: MacroTargets;
  /** Percent of target eaten per macro (rounded; can exceed 100). */
  pct: MacroTargets;
}

/** One logged entry: a linked menu item, or a custom off-menu meal (inline). */
export interface LoggedEntry {
  servings: number;
  menuItem: MacroTargets | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

/** Per-serving macros for an entry: from its menu item, or its inline custom
 *  values when it's an off-menu entry. */
export function entryMacros(e: LoggedEntry): MacroTargets {
  if (e.menuItem) return e.menuItem;
  return {
    calories: e.calories ?? 0,
    protein: e.protein ?? 0,
    carbs: e.carbs ?? 0,
    fat: e.fat ?? 0,
  };
}

/** Sum servings × per-serving macros across logged entries (menu or custom). */
export function sumEaten(entries: LoggedEntry[]): MacroTargets {
  const totals: MacroTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    const per = entryMacros(e);
    for (const m of MACROS) totals[m] += per[m] * e.servings;
  }
  for (const m of MACROS) totals[m] = Math.round(totals[m]);
  return totals;
}

/** Percent of each target eaten (0 when a target is 0). */
export function percentOfTarget(
  eaten: MacroTargets,
  target: MacroTargets,
): MacroTargets {
  const pct = { calories: 0, protein: 0, carbs: 0, fat: 0 } as MacroTargets;
  for (const m of MACROS) {
    pct[m] = target[m] > 0 ? Math.round((eaten[m] / target[m]) * 100) : 0;
  }
  return pct;
}

export function dayProgress(
  date: string,
  eaten: MacroTargets,
  target: MacroTargets,
): DayProgress {
  return { date, eaten, target, pct: percentOfTarget(eaten, target) };
}

/**
 * The N calendar dates ending at (and including) `endDate`, oldest first.
 * Built at local noon so a day never slips across a timezone boundary.
 */
export function dateWindow(endDate: string, days: number): string[] {
  const base = new Date(`${endDate}T12:00:00`);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(localYmd(d));
  }
  return out;
}
