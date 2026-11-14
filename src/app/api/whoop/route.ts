// GET /api/whoop?profileId=&date=&mock=  — today's recovery & strain.
//
//   mock=true  (DEFAULT) — return the seeded WhoopDay row. The demo never
//     depends on a live token (CLAUDE.md "Ship a mock toggle").
//   mock=false — pull the connected user's REAL recovery/strain from WHOOP
//     (needs /api/whoop/connect done once), persist it as today's WhoopDay,
//     and return it. If live is unavailable, fall back to the last known
//     WhoopDay so the app never hard-fails.
import { db } from "@/lib/db";
import { fetchLiveWhoop } from "@/lib/whoop";
import { localYmd } from "@/lib/date";
import type { WhoopSnapshot } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  const date = searchParams.get("date") ?? undefined;
  const mock = searchParams.get("mock") !== "false";

  if (!profileId) {
    return Response.json({ error: "profileId required" }, { status: 400 });
  }

  if (!mock) {
    const live = await fetchLiveWhoop(profileId);
    if (live) {
      // Cache today's real numbers so targets/progress can reuse them.
      const day = date ?? localYmd();
      await db.whoopDay.upsert({
        where: { profileId_date: { profileId, date: day } },
        create: { profileId, date: day, recovery: live.recovery, strain: live.strain, mock: false },
        update: { recovery: live.recovery, strain: live.strain, mock: false },
      });
      const snapshot: WhoopSnapshot = { recovery: live.recovery, strain: live.strain, mock: false };
      return Response.json(snapshot);
    }
    // Live failed/not connected: fall back to the last known row, else a
    // clear message — never a raw error.
    const row = await db.whoopDay.findFirst({ where: { profileId }, orderBy: { date: "desc" } });
    if (row) {
      return Response.json({
        recovery: row.recovery,
        strain: row.strain,
        mock: row.mock,
        note: "live WHOOP unavailable — showing last known data. Connect at /api/whoop/connect.",
      });
    }
    return Response.json(
      { error: "not connected to WHOOP (visit /api/whoop/connect) and no cached data" },
      { status: 503 },
    );
  }

  // Mock path: seeded WhoopDay row.
  const row = await db.whoopDay.findFirst({
    where: { profileId, date },
    orderBy: { date: "desc" },
  });
  if (!row) {
    return Response.json({ error: "no whoop data" }, { status: 404 });
  }
  const snapshot: WhoopSnapshot = { recovery: row.recovery, strain: row.strain, mock: row.mock };
  return Response.json(snapshot);
}
