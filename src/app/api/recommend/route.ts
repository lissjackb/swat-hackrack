// POST /api/recommend — recommend a plate for one meal.
// Body: { meal, date, target, restrictions? }. Pulls the meal's items,
// runs the LP solver, then asks Claude for the "why this plate" note.
import { db } from "@/lib/db";
import { recommendPlate } from "@/lib/recommend";
import { explainPlate } from "@/lib/claude";
import type { MacroTargets, Meal, MenuItemDTO } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    meal: Meal;
    date: string;
    target: MacroTargets;
    restrictions?: string[];
  };

  const rows = await db.menuItem.findMany({
    where: { date: body.date, meal: body.meal },
  });
  const items: MenuItemDTO[] = rows.map((r) => ({
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

  const plate = recommendPlate(items, body.target, body.restrictions ?? []);
  plate.note = await explainPlate(plate);
  return Response.json(plate);
}
