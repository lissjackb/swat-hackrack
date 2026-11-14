// /api/log — "I ate this" logging + progress.
//   POST  { profileId, menuItemId, date, meal, servings }  -> create entry
//   GET   ?profileId=&date=  -> that day's entries + macro totals so far
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    profileId: string;
    menuItemId: string;
    date: string;
    meal: string;
    servings?: number;
  };
  const entry = await db.logEntry.create({
    data: {
      profileId: body.profileId,
      menuItemId: body.menuItemId,
      date: body.date,
      meal: body.meal,
      servings: body.servings ?? 1,
    },
  });
  return Response.json(entry, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;
  const date = searchParams.get("date") ?? undefined;

  const entries = await db.logEntry.findMany({
    where: { profileId, date },
    include: { menuItem: true },
    orderBy: { createdAt: "asc" },
  });

  const totals = entries.reduce(
    (acc, e) => {
      acc.calories += e.menuItem.calories * e.servings;
      acc.protein += e.menuItem.protein * e.servings;
      acc.carbs += e.menuItem.carbs * e.servings;
      acc.fat += e.menuItem.fat * e.servings;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return Response.json({ entries, totals });
}
