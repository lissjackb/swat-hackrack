// /api/log — "I ate this" logging + progress.
//   POST  a MENU entry:   { profileId, menuItemId, date, meal, servings }
//   POST  a CUSTOM entry:  { profileId, date, meal, servings, name, calories, protein, carbs, fat }
//   GET   ?profileId=&date=  -> that day's entries + macro totals so far
import { db } from "@/lib/db";
import { sumEaten } from "@/lib/progress";

// Coerce a value to a non-negative number (missing/garbage -> 0).
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profileId: string;
      date: string;
      meal: string;
      servings?: number;
      menuItemId?: string;
      name?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };

    if (!body.profileId || !body.date || !body.meal) {
      return Response.json({ error: "profileId, date, and meal are required" }, { status: 400 });
    }
    const servings = body.servings ?? 1;

    if (body.menuItemId) {
      // Menu entry: confirm the item exists so a bad id is a clean 400, not an
      // unhandled foreign-key 500.
      const exists = await db.menuItem.findUnique({
        where: { id: body.menuItemId },
        select: { id: true },
      });
      if (!exists) {
        return Response.json({ error: `no menu item '${body.menuItemId}'` }, { status: 400 });
      }
      const entry = await db.logEntry.create({
        data: { profileId: body.profileId, menuItemId: body.menuItemId, date: body.date, meal: body.meal, servings },
      });
      return Response.json(entry, { status: 201 });
    }

    // Custom (off-menu) entry: needs a name; macros default to 0 if omitted.
    if (!body.name) {
      return Response.json(
        { error: "provide menuItemId, or name (+ macros) for a custom meal" },
        { status: 400 },
      );
    }
    const entry = await db.logEntry.create({
      data: {
        profileId: body.profileId,
        date: body.date,
        meal: body.meal,
        servings,
        name: body.name,
        calories: num(body.calories),
        protein: num(body.protein),
        carbs: num(body.carbs),
        fat: num(body.fat),
      },
    });
    return Response.json(entry, { status: 201 });
  } catch (err) {
    // Never surface a raw error to the demo.
    console.error("POST /api/log failed:", err);
    return Response.json({ error: "could not log entry" }, { status: 500 });
  }
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

  const totals = sumEaten(entries);

  return Response.json({ entries, totals });
}
