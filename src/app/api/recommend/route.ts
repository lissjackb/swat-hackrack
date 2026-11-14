// POST /api/recommend — recommend a plate for ONE meal.
// @deprecated Kept for compatibility (PLANNER_SPEC "API") — prefer
// POST /api/plan, which plans the whole day with the shared planner.
// Body: { meal, date, target, restrictions? }. Pulls the meal's items, ranks
// realistic plates (planner rank(); servings may be fractional in 0.5
// steps), then asks Claude for the "why this plate" note.
import { db } from "@/lib/db";
import { recommendPlate } from "@/lib/recommend";
import { explainPlate } from "@/lib/claude";
import { menuItemToDTO } from "@/lib/menu";
import type { DbMeal, MacroTargets } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    meal: DbMeal;
    date: string;
    target: MacroTargets;
    restrictions?: string[];
  };

  const rows = await db.menuItem.findMany({
    where: { date: body.date, meal: body.meal },
  });
  const items = rows.map(menuItemToDTO);

  const plate = recommendPlate(items, body.target, body.restrictions ?? []);
  plate.note = await explainPlate(plate);
  return Response.json(plate);
}
