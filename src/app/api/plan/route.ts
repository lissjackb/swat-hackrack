// POST /api/plan — the whole-day planner (PLANNER_SPEC "API").
// Body: { profileId, day: 'sat' | 'sun', ctx? }
//   - Loads the profile, the demo dates' menu (fromMenuItems) and today's
//     Whoop snapshot (same fallbacks as GET /api/whoop mock path).
//   - Merges the client's ctx (swaps, flex, never-list, locked, …). If
//     ctx.ate / ctx.extras are missing, derives them from LogEntry rows:
//     menu-linked entries → ate, custom entries → extras.
//   - Returns numbers only. Claude text goes through /api/ai (PORT_PLAN).
import { db } from "@/lib/db";
import { localYmd } from "@/lib/date";
import {
  API_MAP,
  MEAL_ID_BY_DATE_MEAL,
  createPlanner,
  partText,
  type MacroSum,
  type PlanContext,
  type PlannerProfile,
} from "@/lib/planner";
import type { ActivityLevel, Goal, Sex } from "@/lib/types";

const DEMO_DATES = [...new Set(Object.values(API_MAP).map((q) => q.date))];

const r1 = (n: number) => Math.round(n * 10) / 10;
const sumR = (t: MacroSum) => ({ k: Math.round(t.k), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) });

export async function POST(request: Request) {
  let body: { profileId?: string; day?: string; ctx?: Partial<PlanContext> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { profileId, ctx: clientCtx } = body;
  const day = body.day === "sun" ? "sun" : "sat";
  if (!profileId) {
    return Response.json({ error: "profileId required" }, { status: 400 });
  }

  const profileRow = await db.profile.findUnique({ where: { id: profileId } });
  if (!profileRow) {
    return Response.json({ error: `no profile '${profileId}'` }, { status: 404 });
  }

  const restrictions = JSON.parse(profileRow.restrictions) as string[];
  const profile: PlannerProfile = {
    name: profileRow.name,
    goal: profileRow.goal as Goal,
    sex: profileRow.sex as Sex,
    age: profileRow.age,
    weightKg: profileRow.weightKg,
    heightCm: profileRow.heightCm,
    activityLevel: profileRow.activityLevel as ActivityLevel,
    restrictions,
    // Client prefs (snack/fifth/never/days…) ride in via ctx.p below.
    ...(clientCtx?.p ?? {}),
  };

  const today = localYmd();
  const [rows, whoopRow, logs] = await Promise.all([
    db.menuItem.findMany({ where: { date: { in: DEMO_DATES } } }),
    // Today's snapshot, falling back like /api/whoop's mock path.
    (async () => {
      let row = await db.whoopDay.findFirst({ where: { profileId, date: today } });
      if (!row) row = await db.whoopDay.findFirst({ where: { profileId }, orderBy: { date: "desc" } });
      if (!row && profileId !== "demo-profile") {
        row = await db.whoopDay.findFirst({ where: { profileId: "demo-profile" }, orderBy: { date: "desc" } });
      }
      return row;
    })(),
    db.logEntry.findMany({
      where: { profileId, date: { in: DEMO_DATES } },
      include: { menuItem: true },
    }),
  ]);

  // Derive ate/extras from the log when the client didn't send them.
  let ate = clientCtx?.ate;
  let extras = clientCtx?.extras;
  if (!ate || !extras) {
    const dAte: Record<string, string[]> = {};
    const dExtras: (MacroSum & { name?: string })[] = [];
    for (const e of logs) {
      if (e.menuItem) {
        const mealId = MEAL_ID_BY_DATE_MEAL[`${e.date}|${e.meal}`];
        if (!mealId) continue;
        (dAte[mealId] ??= []).push(e.menuItem.name);
      } else {
        dExtras.push({
          name: e.name ?? "Custom meal",
          k: (e.calories ?? 0) * e.servings,
          p: (e.protein ?? 0) * e.servings,
          c: (e.carbs ?? 0) * e.servings,
          f: (e.fat ?? 0) * e.servings,
        });
      }
    }
    ate ??= dAte;
    extras ??= dExtras;
  }

  const whoop = clientCtx?.whoop ?? (whoopRow
    ? { recovery: whoopRow.recovery, strain: whoopRow.strain, mock: whoopRow.mock }
    : null);

  const planner = createPlanner(rows, {
    ...clientCtx,
    p: profile,
    whoop,
    device: clientCtx?.device ?? (whoop ? "whoop" : null),
    perms: clientCtx?.perms ?? { recovery: true },
    ate,
    extras,
  });

  const T = planner.targets();
  const meals = planner.plan(day).map((x) => {
    const q = API_MAP[x.m.id] ?? (x.m.from ? API_MAP[x.m.from] : undefined);
    return {
      mealId: x.m.id,
      name: x.m.name,
      date: q?.date ?? null,
      dbMeal: API_MAP[x.m.id]?.meal ?? null,
      kind: x.m.kind,
      tgt: { k: Math.round(x.tgt.k), p: Math.round(x.tgt.p) },
      parts: x.parts.map((pp) => ({
        menuItemId: pp.it.menuItemId ?? null,
        name: pp.it.name,
        station: pp.it.station,
        m: r1(pp.m),
        portion: partText(pp),
        kcal: Math.round(pp.it.nut![0] * pp.m),
        p: Math.round(pp.it.nut![1] * pp.m),
        c: Math.round(pp.it.nut![2] * pp.m),
        f: Math.round(pp.it.nut![3] * pp.m),
      })),
      tot: sumR(x.tot),
      alternatives: x.ranked.map((r) => ({
        main: r.main,
        kcal: Math.round(r.t.k),
        p: Math.round(r.t.p),
      })),
      removed: x.removed ?? [],
      trimmed: !!x.trimmed,
      boosted: !!x.boosted,
      deltaK: Math.round(x.deltaK ?? 0),
      locked: !!x.locked,
    };
  });

  return Response.json({
    day,
    targets: T,
    status: planner.planStatus(day),
    whoop,
    meals,
  });
}
