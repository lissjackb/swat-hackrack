// GET /api/progress?profileId=&date=YYYY-MM-DD[&days=7]
//   Daily progress (eaten vs. target) for `date`, plus a week view of the
//   trailing `days` days. Targets come from the Mifflin-St Jeor formula
//   (src/lib/targets.ts), adjusted by that day's Whoop row if one exists, so
//   progress lines up with what the plate/targets endpoints show.
//
// The week view intentionally uses whatever is logged (seeded demo history
// included — CLAUDE.md). On a bad profileId we return a clear message, never
// a raw error.
import { db } from "@/lib/db";
import { computeTargets } from "@/lib/targets";
import { dateWindow, dayProgress, sumEaten } from "@/lib/progress";
import type {
  ActivityLevel,
  Goal,
  ProfileInput,
  Sex,
  WhoopSnapshot,
} from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  const date = searchParams.get("date");
  const days = Math.max(1, Math.min(31, Number(searchParams.get("days") ?? 7)));

  if (!profileId || !date) {
    return Response.json(
      { error: "profileId and date (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  const profileRow = await db.profile.findUnique({ where: { id: profileId } });
  if (!profileRow) {
    return Response.json({ error: `no profile '${profileId}'` }, { status: 404 });
  }
  const profile: ProfileInput = {
    name: profileRow.name,
    goal: profileRow.goal as Goal,
    heightCm: profileRow.heightCm,
    weightKg: profileRow.weightKg,
    age: profileRow.age,
    sex: profileRow.sex as Sex,
    activityLevel: profileRow.activityLevel as ActivityLevel,
    restrictions: JSON.parse(profileRow.restrictions) as string[],
  };

  const window = dateWindow(date, days);

  // Both queries cover the whole window and are independent — run concurrently.
  const [entries, whoopRows] = await Promise.all([
    db.logEntry.findMany({ where: { profileId, date: { in: window } }, include: { menuItem: true } }),
    db.whoopDay.findMany({ where: { profileId, date: { in: window } } }),
  ]);

  const whoopByDate = new Map<string, WhoopSnapshot>(
    whoopRows.map((w) => [w.date, { recovery: w.recovery, strain: w.strain, mock: w.mock }]),
  );
  // Group entries by date in one pass, instead of re-scanning per day.
  const entriesByDate = new Map<string, typeof entries>();
  for (const e of entries) {
    const bucket = entriesByDate.get(e.date) ?? [];
    bucket.push(e);
    entriesByDate.set(e.date, bucket);
  }

  const targetFor = (d: string) =>
    computeTargets(profile, whoopByDate.get(d)).daily;

  const week = window.map((d) =>
    dayProgress(d, sumEaten(entriesByDate.get(d) ?? []), targetFor(d)),
  );

  // dateWindow always includes `date` (the i=0 element), so this is present.
  const daily = week.find((w) => w.date === date)!;

  return Response.json({ profileId, date, daily, week });
}
