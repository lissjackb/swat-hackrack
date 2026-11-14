// GET /api/menu?date=YYYY-MM-DD&meal=lunch — menu items from the DB.
// Both query params optional; omit to get everything for the day.
import { db } from "@/lib/db";
import type { MenuItemDTO } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const meal = searchParams.get("meal") ?? undefined;

  const rows = await db.menuItem.findMany({
    where: { date, meal },
    orderBy: [{ meal: "asc" }, { station: "asc" }, { name: "asc" }],
  });

  const items: MenuItemDTO[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    meal: r.meal as MenuItemDTO["meal"],
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

  return Response.json({ items });
}
