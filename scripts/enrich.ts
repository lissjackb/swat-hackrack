// Fill the demo dates' menu macros from USDA FoodData Central, directly
// against the DB — no dev server needed (the /api/nutrition route stays for
// the UI's live ?name= lookups; this is the same logic as its ?date= mode).
// Runs as part of `npm run seed` (scrape → enrich → seed).
//
// Station theme headers ("Chefs Choice", "Steak Night", …) are not food and
// are left at 0 macros so the planner skips them.
// Load .env.local FIRST (USDA_API_KEY lives there; `next dev` reads it
// automatically but plain scripts don't), then .env (DATABASE_URL).
// dotenv never overrides already-set vars, so the order gives .env.local
// precedence, matching Next's behavior.
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local" });
dotenv();
import { db } from "../src/lib/db";
import { lookupNutrition } from "../src/lib/usda";
import { API_MAP, THEMES } from "../src/lib/planner";

const DEMO_DATES = [...new Set(Object.values(API_MAP).map((q) => q.date))];

async function enrichDate(date: string): Promise<void> {
  const rows = await db.menuItem.findMany({
    where: { date },
    orderBy: [{ meal: "asc" }, { station: "asc" }, { name: "asc" }],
  });
  let matched = 0;
  let skippedThemes = 0;
  // Sequential on purpose: USDA rate-limits per hour, and the in-process
  // cache in usda.ts makes repeated item names across dates cost one call.
  for (const r of rows) {
    if (THEMES.has(r.name)) { skippedThemes++; continue; }
    const nutrition = await lookupNutrition(r.name);
    if (!nutrition) continue;
    matched++;
    await db.menuItem.update({
      where: { id: r.id },
      data: {
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      },
    });
  }
  console.log(`  ${date}: matched ${matched}/${rows.length - skippedThemes} items (${skippedThemes} theme headers left at 0)`);
}

async function main() {
  if (!process.env.USDA_API_KEY) {
    console.warn("USDA_API_KEY not set — falling back to DEMO_KEY (~30 req/hr; enrichment will be slow/partial).");
  }
  console.log(`Enriching demo dates from USDA: ${DEMO_DATES.join(", ")}`);
  for (const date of DEMO_DATES) await enrichDate(date);
  console.log("Enrich complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
