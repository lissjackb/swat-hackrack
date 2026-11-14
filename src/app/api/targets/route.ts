// POST /api/targets — profile inputs (+ optional whoop) -> macro targets.
// Pure computation, no DB. See src/lib/targets.ts.
import { computeTargets } from "@/lib/targets";
import type { ProfileInput, WhoopSnapshot } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    profile: ProfileInput;
    whoop?: WhoopSnapshot;
  };
  // TODO: validate body (zod or manual) before trusting it.
  const targets = computeTargets(body.profile, body.whoop);
  return Response.json(targets);
}
