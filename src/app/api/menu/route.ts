// GET /api/menu?date=YYYY-MM-DD&meal=lunch — menu items from the DB.
// Both query params optional; omit to get everything for the day.
import { db } from "@/lib/db";
import { menuItemToDTO } from "@/lib/menu";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const meal = searchParams.get("meal") ?? undefined;

  const rows = await db.menuItem.findMany({
    where: { date, meal },
    orderBy: [{ meal: "asc" }, { station: "asc" }, { name: "asc" }],
  });

  const items = rows.map(menuItemToDTO);

  return Response.json({ items });
}
