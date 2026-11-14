// View helpers ported from the mockup that aren't part of the planner module:
// clock/title (397–402, 739–744), item icons (753–754), tagsText (780–785),
// parseQty (333–340), swapCands (1050–1061), neverLabel (639), body-goal math
// (1406–1448). Pure functions only.
import {
  ALLERGENS, GOALS, MEALS, NOW,
  type Planner, type PlannerItem, type PlannerProfile,
  dispName, multsFor,
} from "@/lib/planner";
import type { Part } from "@/lib/planner";

export const clock = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")}`;
};
export const ampm = (t: string) => (+t.split(":")[0] >= 12 ? "PM" : "AM");

export const titleName = (it: PlannerItem) =>
  dispName(it).replace(" · Free Zone", "").replace(" (Free Zone)", "");

export function title(parts: Part[]): string {
  if (!parts.length) return "Nothing selected";
  const names = parts.map((x) => titleName(x.it).replace(/^Assorted /, ""));
  return names.slice(0, 3).map((n, i) => (i ? n.toLowerCase() : n)).join(", ");
}

export const ROLEICON: Record<string, string> = {
  P: "i-drum", X: "i-pizza", C: "i-bowl", V: "i-leaf",
  F: "i-apple", D: "i-milk", S: "i-cake", K: "i-drop",
};
export const itemIcon = (it: PlannerItem) => (it.nut ? ROLEICON[it.nut[6]] : "i-dining");

export function tagsText(it: PlannerItem) {
  const keep = ["vegan", "vegetarian", "gluten free", "halal", "kosher"];
  const al = ALLERGENS.filter((a) => it.tags.has(a[0])).map((a) => a[1]);
  const d = keep.filter((k) => it.tags.has(k)).map((k) => k[0].toUpperCase() + k.slice(1));
  return { diet: d, allergens: al.concat(it.tags.has("pork") ? ["Pork"] : []) };
}

/** Fuel-ring band label from recovery (PLANNER_SPEC: ≥67 / 34–66 / <34; the
 * mockup only had "Optimal" — other two wordings pending Griffy). */
export const fuelBand = (recovery: number) =>
  recovery >= 67 ? "Optimal" : recovery >= 34 ? "Moderate" : "Low";

const NUMW: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, half: 0.5, "½": 0.5 };
export function parseQty(raw: string) {
  let q = String(raw || "").toLowerCase().trim();
  let n = 1;
  const m = q.match(/^(\d+(?:\.\d+)?|½|a|an|one|two|three|four|five|half)\b\s*(?:x\s+)?/);
  if (m) { n = isNaN(+m[1]) ? NUMW[m[1]] : +m[1]; q = q.slice(m[0].length); }
  const m2 = q.match(/\s*x\s*(\d+(?:\.\d+)?)$/);
  if (m2) { n *= +m2[1]; q = q.slice(0, m2.index); }
  return {
    n: Math.max(0.5, Math.min(10, n || 1)),
    q: q.replace(/\b(of|the|some|my|with|w\/|and)\b/g, " ").replace(/\s+/g, " ").trim(),
  };
}

/** Replace the single free-text "other" allergy (immutable; mockup 292). */
export function withOtherRestriction(restrictions: string[], text: string, dietValues: Set<string>, allergenKeys: Set<string>): string[] {
  const t = String(text || "").trim();
  const kept = (restrictions || []).filter((r) => r === "halal" || dietValues.has(r) || allergenKeys.has(r));
  if (t) kept.push(t);
  return kept;
}

/** Swap-one-item candidates (mockup 1050–1061). */
export function swapCands(E: Planner, p: PlannerProfile, mealId: string, key: string) {
  const m = MEALS.find((x) => x.id === mealId)!;
  const x = E.plan(m.day).find((y) => y.m.id === mealId)!;
  const pp = x.parts.find((q) => (q.from || q.it.name) === key)!;
  const role = pp.it.nut![6];
  const grp = ["P", "X"].includes(role) ? ["P", "X"] : ["V", "F"].includes(role) ? ["V", "F"] : ["C", "S"].includes(role) ? ["C"] : [role];
  const inMeal = new Set(x.parts.map((q) => q.it.name));
  const k0 = pp.it.nut![0] * pp.m, p0 = pp.it.nut![1] * pp.m;
  const out = E.itemsFor(mealId)
    .filter((it) => E.fits(it) && grp.includes(it.nut![6]) && !inMeal.has(it.name))
    .map((it) => {
      let best: { it: PlannerItem; m: number; k: number; p: number; e: number } | null = null;
      for (const mm of multsFor(it, [0.5, 1, 1.5, 2, 2.5, 3])) {
        const k = it.nut![0] * mm, pr = it.nut![1] * mm;
        const e = Math.abs(k - k0) / Math.max(k0, 50) + 1.2 * Math.abs(pr - p0) / Math.max(p0, 8);
        if (!best || e < best.e) best = { it, m: mm, k, p: pr, e };
      }
      return best;
    })
    .filter(Boolean)
    .sort((a, b) => a!.e - b!.e)
    .slice(0, 6) as { it: PlannerItem; m: number; k: number; p: number; e: number }[];
  return { pp, k0, p0, out, x };
}

export function neverLabel(E: Planner, n: string): string {
  for (const m of MEALS) {
    const it = E.findItem(n, m.id);
    if (it && it.nut) return dispName(it).replace(/ \(.*\)$/, "");
  }
  return n.replace(/ FZ$/, "");
}

/* ---- Body-goal plan builder (mockup 1406–1448): rate capped at 1% of body
   weight a week (0.5% for cuts when BMI < 20). ---- */
export const TODAY = new Date(2026, 10, 14);
export const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== 2026 ? "numeric" : undefined });
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface GoalPlanOut {
  same?: boolean;
  cur: number; tgt: number; diff?: number; weeks?: number; weeksWanted?: number;
  want?: Date; extended?: boolean; rate?: number; cap?: number; capPct?: number;
  bmi?: number; end?: Date; ms?: { w: number; date: Date; lb: number }[];
  why?: string; mismatch?: string; dir?: "gain" | "loss";
}

export function goalPlan(
  g: { target: number | string; date: string } | null | undefined,
  p: { lb: number | string; ft: number | string; inch: number | string; goal: string | null },
): GoalPlanOut | null {
  if (!g || !(+(g.target ?? 0) > 0) || !g.date) return null;
  const cur = +p.lb, tgt = +g.target, diff = tgt - cur;
  if (Math.abs(diff) < 0.5) return { same: true, cur, tgt };
  const parts = String(g.date).split("-").map(Number);
  const want = new Date(parts[0], parts[1] - 1, parts[2]);
  const weeksWanted = Math.max(1, Math.round((want.getTime() - TODAY.getTime()) / (7 * 864e5)));
  const kg = cur * 0.4536, mtr = (+p.ft * 12 + +p.inch) * 0.0254, bmi = kg / (mtr * mtr);
  const lowBmiCut = diff < 0 && bmi < 20;
  const capPct = lowBmiCut ? 0.005 : 0.01;
  const cap = cur * capPct;
  const rateWanted = Math.abs(diff) / weeksWanted;
  const extended = rateWanted > cap + 1e-9;
  const weeks = extended ? Math.ceil(Math.abs(diff) / cap) : weeksWanted;
  const rate = Math.abs(diff) / weeks;
  const end = new Date(TODAY.getTime() + weeks * 7 * 864e5);
  const every = Math.max(1, Math.ceil(weeks / 8));
  const ms: { w: number; date: Date; lb: number }[] = [];
  for (let w = every; w < weeks; w += every) ms.push({ w, date: new Date(TODAY.getTime() + w * 7 * 864e5), lb: cur + diff * (w / weeks) });
  ms.push({ w: weeks, date: end, lb: tgt });
  const dir: "gain" | "loss" = diff > 0 ? "gain" : "loss";
  const why = extended
    ? `${fmtDate(want)} would take ${rateWanted.toFixed(1)} lb a week. We cap ${dir} at ${(capPct * 100).toFixed(capPct < 0.01 ? 1 : 0)}% of body weight (${cap.toFixed(1)} lb a week)${lowBmiCut ? " because your BMI is under 20" : ""}, so the plan ends ${fmtDate(end)} instead.`
    : "";
  const mismatch =
    p.goal === "cut" && diff > 0
      ? "Your goal is a cut, but this target is a gain."
      : p.goal === "build" && diff < 0
        ? `Your goal is a ${GOALS[p.goal].label.toLowerCase()}, but this target is a loss.`
        : "";
  return { cur, tgt, diff, weeks, weeksWanted, want, extended, rate, cap, capPct, bmi, end, ms, why, mismatch, dir };
}

export const listNames = (a: string[]) =>
  a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

export { NOW };
