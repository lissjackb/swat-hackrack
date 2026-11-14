// GET /api/nutrition — fill in menu macros from USDA FoodData Central.
//
// Two modes:
//   ?name=Grilled%20Chicken
//     One-off lookup. Returns { name, nutrition } (nutrition is null if USDA
//     has no match). No database writes.
//
//   ?date=YYYY-MM-DD[&meal=lunch][&persist=false]
//     Enrich the stored menu for that day (optionally one meal). Looks up each
//     item by name and, unless persist=false, writes calories/protein/carbs/
//     fat back into the MenuItem rows so the solver has real numbers. Returns
//     the enriched items plus a match summary.
//
// The Swarthmore feed has no nutrition (scripts/scrape.ts loads macros as 0),
// so this is how those zeros get filled. USDA values are per 100g — see
// src/lib/usda.ts. On any failure we return a clear message with null/0
// nutrition, never a raw error: the demo must not show a stack trace.
import { db } from "@/lib/db";
import { lookupNutrition } from "@/lib/usda";
import { menuItemToDTO } from "@/lib/menu";
import type { MenuItemDTO } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const date = searchParams.get("date");
  const meal = searchParams.get("meal") ?? undefined;
  const persist = searchParams.get("persist") !== "false"; // default: persist

  // Mode 1: single name lookup, no DB.
  if (name) {
    const nutrition = await lookupNutrition(name);
    return Response.json({ name, nutrition });
  }

  // Mode 2: enrich a day's stored menu.
  if (!date) {
    return Response.json(
      { error: "Pass ?name=<food> for a single lookup, or ?date=YYYY-MM-DD to enrich the menu." },
      { status: 400 },
    );
  }

  const rows = await db.menuItem.findMany({
    where: { date, meal },
    orderBy: [{ meal: "asc" }, { station: "asc" }, { name: "asc" }],
  });

  let matched = 0;
  const items: MenuItemDTO[] = [];
  // Sequential on purpose: USDA rate-limits per hour, and the in-process cache
  // in usda.ts means repeated item names across the week cost only one call.
  for (const r of rows) {
    const nutrition = await lookupNutrition(r.name);
    const macros = nutrition
      ? {
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
        }
      : { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat };

    if (nutrition) {
      matched++;
      if (persist) {
        await db.menuItem.update({ where: { id: r.id }, data: macros });
      }
    }

    // Map the row, overriding the four macro fields with the looked-up values.
    items.push(menuItemToDTO({ ...r, ...macros }));
  }

  return Response.json({
    date,
    meal: meal ?? null,
    total: rows.length,
    matched,
    persisted: persist,
    items,
  });
}
