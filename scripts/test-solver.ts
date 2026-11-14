// Solver test (demo-check step 4 / solver-test skill) — now runs the shared
// DAY planner (src/lib/planner/), which replaced the LP solver
// (docs/PLANNER_SPEC.md). Pass criteria (the skill's list):
//   - Day kcal within ±3% of target, or planStatus reports the closest the
//     menu allows.
//   - Protein ≥ target − 0.5 g (same reporting escape hatch).
//   - ZERO conflict() violations — hard FAIL, whatever else passes.
//   - Eggs ≤ 1 per day, any dish ≤ 2 per day, no S/K-role items chosen as
//     plate components.
//   - Under 500 ms per day.
//
// DATA SOURCE: the enriched DB for the demo dates (falls back to the built-in
// mockup menu when a slot has no usable rows), exactly what /api/plan reads.
import "dotenv/config";
import { db } from "../src/lib/db";
import { computeTargets } from "../src/lib/targets";
import {
  API_MAP,
  conflict,
  createPlanner,
  famOf,
  normalizeContext,
  type PlannerProfile,
} from "../src/lib/planner";
import type { ProfileInput } from "../src/lib/types";
import { profileFromInput } from "../src/lib/planner/context";

const DEMO_DATES = [...new Set(Object.values(API_MAP).map((q) => q.date))];
const DAYS = ["sat", "sun"] as const;

// The solver-test skill's profiles (server units — DB-shaped).
const PROFILES: { label: string; profile: ProfileInput }[] = [
  {
    label: "Build",
    profile: { name: "Build", goal: "build", heightCm: 183, weightKg: 82, age: 20, sex: "male", activityLevel: "veryActive", restrictions: [] },
  },
  {
    label: "Cut",
    profile: { name: "Cut", goal: "cut", heightCm: 175, weightKg: 85, age: 19, sex: "male", activityLevel: "moderate", restrictions: [] },
  },
  {
    label: "Maintain (vegetarian)",
    profile: { name: "Maintain", goal: "maintain", heightCm: 165, weightKg: 57, age: 20, sex: "female", activityLevel: "active", restrictions: ["vegetarian"] },
  },
  {
    label: "Perform (vegan, peanut+tree nut allergy)",
    profile: { name: "Perform", goal: "perform", heightCm: 170, weightKg: 63, age: 21, sex: "female", activityLevel: "light", restrictions: ["vegan", "peanut", "tree nut"] },
  },
];

let anyFail = false;

async function main() {
  const rows = await db.menuItem.findMany({
    where: { date: { in: DEMO_DATES } },
    orderBy: [{ meal: "asc" }, { station: "asc" }, { name: "asc" }], // same order as /api/menu (rank tie-breaks)
  });
  console.log(`Planner test — DB rows: ${rows.length} (${DEMO_DATES.join(", ")})\n`);

  for (const { label, profile } of PROFILES) {
    console.log(`${label}:`);
    const p: PlannerProfile = profileFromInput(profile);
    const planner = createPlanner(rows, normalizeContext({ p, device: null, whoop: null }));
    const T = planner.targets();

    for (const day of DAYS) {
      const t0 = performance.now();
      const meals = planner.plan(day);
      const ms = performance.now() - t0;
      const status = planner.planStatus(day);

      const tot = { k: 0, p: 0, c: 0, f: 0 };
      meals.forEach((x) => { tot.k += x.tot.k; tot.p += x.tot.p; tot.c += x.tot.c; tot.f += x.tot.f; });

      const kcalOk = Math.abs(tot.k - T.kcal) <= T.kcal * 0.03 + 1;
      const protOk = tot.p >= T.p - 0.5;
      const timeOk = ms < 500;

      // Hard constraint: zero conflict() violations anywhere (plate parts AND
      // ranked alternatives, which feed swaps).
      const violations: string[] = [];
      const fam: Record<string, number> = {};
      const eggMeals = new Set<string>();
      let roleBad = "";
      for (const x of meals) {
        for (const pp of x.parts) {
          if (conflict(pp.it, p)) violations.push(`${x.m.id}:${pp.it.name}`);
          fam[famOf(pp.it.name)] = (fam[famOf(pp.it.name)] || 0) + 1;
          if (famOf(pp.it.name) === "egg") eggMeals.add(x.m.id);
          if (["S", "K"].includes(pp.it.nut![6]) && !pp.user) roleBad = pp.it.name;
        }
        for (const r of x.ranked) for (const pp of r.parts) {
          if (conflict(pp.it, p)) violations.push(`${x.m.id}(alt):${pp.it.name}`);
        }
      }
      // Egg cap applies across meals (see test-planner's note on the mockup's
      // within-plate okV gap, ported as-is).
      const eggsOk = eggMeals.size <= 1;
      const dupes = Object.entries(fam).filter(([k, v]) => k !== "egg" && v > 2);

      const reported = !kcalOk || !protOk ? !!status.msg : true; // miss must be reported
      const pass = violations.length === 0 && eggsOk && dupes.length === 0 && !roleBad && timeOk &&
        ((kcalOk && protOk) || reported);
      if (!pass) anyFail = true;

      const flags: string[] = [];
      if (!kcalOk) flags.push(`kcal ${Math.round(tot.k)} vs ${T.kcal} ±3%${status.msg ? ` (reported: "${status.msg}")` : " UNREPORTED"}`);
      if (!protOk) flags.push(`protein ${Math.round(tot.p)} < ${T.p}${status.msg ? ` (reported)` : " UNREPORTED"}`);
      if (violations.length) flags.push(`CONFLICT VIOLATION: ${violations.join(", ")}`);
      if (!eggsOk) flags.push(`egg dishes in ${eggMeals.size} meals`);
      if (dupes.length) flags.push(`dish >2/day: ${dupes.map(([k, v]) => `${k}×${v}`).join(", ")}`);
      if (roleBad) flags.push(`S/K-role component: ${roleBad}`);
      if (!timeOk) flags.push(`slow ${ms.toFixed(0)}ms`);

      console.log(
        `  ${day.padEnd(4)} ${pass ? "PASS" : "FAIL"}  ` +
        `kcal ${String(Math.round(tot.k)).padStart(4)}/${String(T.kcal).padStart(4)}  ` +
        `P ${String(Math.round(tot.p)).padStart(3)}/${String(T.p).padStart(3)}  ` +
        `C ${String(Math.round(tot.c)).padStart(3)}  F ${String(Math.round(tot.f)).padStart(3)}  ` +
        `[${meals.length} meals, ${ms.toFixed(0)}ms]` +
        (flags.length ? `  <= ${flags.join("; ")}` : ""),
      );
    }
  }

  // Whoop adjustment direction (computeTargets wraps the same planner rule, so
  // /api/targets and /api/progress agree with the screen).
  console.log(`\nWhoop adjustment (Build profile):`);
  const build = PROFILES[0].profile;
  const base = computeTargets(build).daily;
  const highStrain = computeTargets(build, { strain: 18, recovery: 60, mock: true }).daily;
  const redRecovery = computeTargets(build, { strain: 8, recovery: 25, mock: true }).daily;
  console.log(`  base:         ${base.calories} kcal, ${base.protein}g protein, ${base.carbs}g carbs`);
  console.log(`  high strain:  ${highStrain.calories} kcal (+${highStrain.calories - base.calories}), ${highStrain.protein}g protein, ${highStrain.carbs}g carbs  (expect +150 kcal to carbs)`);
  console.log(`  red recovery: ${redRecovery.calories} kcal, ${redRecovery.protein}g protein (expect ×1.1), ${redRecovery.carbs}g carbs`);
  const strainOk = highStrain.calories === base.calories + 150 && highStrain.carbs > base.carbs;
  const recoveryOk = redRecovery.protein === Math.round(base.protein * 1.1);
  if (!strainOk || !recoveryOk) anyFail = true;
  console.log(`  strain shift ${strainOk ? "OK" : "FAIL"}, recovery shift ${recoveryOk ? "OK" : "FAIL"}`);

  console.log(`\n=== ${anyFail ? "FAIL" : "PASS"} ===`);
  await db.$disconnect();
  if (anyFail) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
