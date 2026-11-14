// Solver test (demo-check step 4 / solver-test skill).
// Builds breakfast/lunch/dinner plates for each test profile and checks them
// against the skill's pass criteria.
//
// DATA SOURCE: the enriched DB for today, NOT data/menu-snapshot.json. The
// snapshot JSON has no macros (0 cal/protein/...) — nutrition is filled into
// the DB by /api/nutrition (USDA). The real demo path (/api/recommend) reads
// the DB too, so testing against it exercises what actually ships.
import "dotenv/config";
import { db } from "../src/lib/db";
import { computeTargets } from "../src/lib/targets";
import { recommendPlate, filterByRestrictions } from "../src/lib/recommend";
import type { Meal, MenuItemDTO, ProfileInput, WhoopSnapshot } from "../src/lib/types";

const DATE = "2026-11-13"; // today — the enriched day
const MEALS: Meal[] = ["breakfast", "lunch", "dinner"];
const TOL = 0.1; // within 10%

interface TestProfile {
  label: string;
  profile: ProfileInput;
  whoop?: WhoopSnapshot;
}

// restrictions use the keys src/lib/recommend.ts understands: lowercase diet
// keys (vegan/vegetarian) hit REQUIRES_LABEL; anything else is an allergen
// matched case-insensitively against item.allergens (so "Peanut","Tree Nut").
const PROFILES: TestProfile[] = [
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
    profile: { name: "Perform", goal: "perform", heightCm: 170, weightKg: 63, age: 21, sex: "female", activityLevel: "light", restrictions: ["vegan", "Peanut", "Tree Nut"] },
  },
];

async function itemsFor(meal: Meal): Promise<MenuItemDTO[]> {
  const rows = await db.menuItem.findMany({ where: { date: DATE, meal } });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    meal: r.meal as Meal,
    station: r.station,
    name: r.name,
    servingSize: r.servingSize,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    dietary: JSON.parse(r.dietary) as string[],
    allergens: JSON.parse(r.allergens) as string[],
  }));
}

const within = (actual: number, target: number) =>
  target === 0 ? actual === 0 : Math.abs(actual - target) / target <= TOL;
const pct = (actual: number, target: number) =>
  target === 0 ? "—" : `${Math.round(((actual - target) / target) * 100)}%`;

let anyFail = false;

async function testPlate(label: string, meal: Meal, p: TestProfile) {
  const target = computeTargets(p.profile, p.whoop).perMeal[meal];
  const all = await itemsFor(meal);
  const candidates = filterByRestrictions(all, p.profile.restrictions);

  const t0 = performance.now();
  const plate = recommendPlate(all, target, p.profile.restrictions);
  const ms = performance.now() - t0;

  const distinct = plate.items.length;
  const maxServings = plate.items.reduce((m, pi) => Math.max(m, pi.servings), 0);

  // Hard constraint: re-verify no plate item violates restrictions.
  const violations = plate.items.filter(
    (pi) => !filterByRestrictions([pi.item], p.profile.restrictions).length,
  );

  // Is the menu itself capable of the protein target? (candidates maxed out)
  const menuMaxProtein = candidates.reduce((s, i) => s + i.protein * 2, 0);
  const menuLimited = menuMaxProtein < target.protein * (1 - TOL);

  const calOk = within(plate.totals.calories, target.calories);
  const proOk = within(plate.totals.protein, target.protein);
  const constraintsOk = distinct <= 4 && maxServings <= 2;
  const timeOk = ms < 500;
  const allergenOk = violations.length === 0;
  const pass = calOk && proOk && constraintsOk && timeOk && allergenOk;
  if (!pass) anyFail = true;

  const flags: string[] = [];
  if (!calOk) flags.push(`cal ${pct(plate.totals.calories, target.calories)}`);
  if (!proOk) flags.push(`protein ${pct(plate.totals.protein, target.protein)}`);
  if (!constraintsOk) flags.push(`shape ${distinct} items / ${maxServings} max-servings`);
  if (!timeOk) flags.push(`slow ${ms.toFixed(0)}ms`);
  if (!allergenOk) flags.push(`ALLERGEN/DIET VIOLATION: ${violations.map((v) => v.item.name).join(", ")}`);
  if (!proOk && menuLimited) flags.push(`(menu-limited: candidates max ~${Math.round(menuMaxProtein)}g protein)`);

  console.log(
    `  ${meal.padEnd(9)} ${pass ? "PASS" : "FAIL"}  ` +
      `kcal ${String(plate.totals.calories).padStart(4)}/${String(target.calories).padStart(4)}  ` +
      `P ${String(plate.totals.protein).padStart(3)}/${String(target.protein).padStart(3)}  ` +
      `C ${String(plate.totals.carbs).padStart(3)}/${String(target.carbs).padStart(3)}  ` +
      `F ${String(plate.totals.fat).padStart(3)}/${String(target.fat).padStart(3)}  ` +
      `[${distinct} items, ${ms.toFixed(0)}ms]` +
      (flags.length ? `  <= ${flags.join("; ")}` : ""),
  );
}

async function main() {
  console.log(`Solver test — enriched DB, date ${DATE}\n`);
  for (const p of PROFILES) {
    console.log(`${p.label}:`);
    for (const meal of MEALS) await testPlate(p.label, meal, p);
  }

  // Whoop adjustment: Build profile, high strain then red recovery.
  console.log(`\nWhoop adjustment (Build profile):`);
  const build = PROFILES[0].profile;
  const base = computeTargets(build).daily;
  const highStrain = computeTargets(build, { strain: 18, recovery: 60, mock: true }).daily;
  const redRecovery = computeTargets(build, { strain: 8, recovery: 25, mock: true }).daily;
  console.log(`  base:         ${base.calories} kcal, ${base.protein}g protein, ${base.carbs}g carbs`);
  console.log(`  high strain:  ${highStrain.calories} kcal, ${highStrain.protein}g protein, ${highStrain.carbs}g carbs  (expect MORE cal/carbs)`);
  console.log(`  red recovery: ${redRecovery.calories} kcal, ${redRecovery.protein}g protein, ${redRecovery.carbs}g carbs  (expect MORE protein)`);
  const strainOk = highStrain.calories > base.calories && highStrain.carbs > base.carbs;
  const recoveryOk = redRecovery.protein > base.protein;
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
