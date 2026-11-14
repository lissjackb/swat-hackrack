// GET /api/whoop?profileId=&date=&mock=true — today's recovery & strain.
//
// Thin slice for the demo: when mock=true (default) we return the seeded
// WhoopDay row so nothing depends on a live OAuth token. The real OAuth
// path (token exchange in /api/whoop/callback, live fetch here) is a
// stretch — wire it behind mock=false later. See CLAUDE.md "Whoop notes".
import { db } from "@/lib/db";
import type { WhoopSnapshot } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  const date = searchParams.get("date") ?? undefined;
  const mock = searchParams.get("mock") !== "false";

  if (!mock) {
    // TODO: real Whoop fetch using a stored access token.
    return Response.json(
      { error: "live Whoop not wired yet — use mock=true" },
      { status: 501 },
    );
  }

  if (!profileId) {
    return Response.json({ error: "profileId required" }, { status: 400 });
  }

  const row = await db.whoopDay.findFirst({
    where: { profileId, date },
    orderBy: { date: "desc" },
  });

  if (!row) {
    return Response.json({ error: "no whoop data" }, { status: 404 });
  }

  const snapshot: WhoopSnapshot = {
    recovery: row.recovery,
    strain: row.strain,
    mock: row.mock,
  };
  return Response.json(snapshot);
}
