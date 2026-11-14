// /api/profile — create and read student profiles.
//   POST  { name, goal, heightCm, weightKg, age, sex, activityLevel, restrictions? }
//         -> creates a Profile row, returns it (with its new id). Onboarding
//            calls this, then keys log/progress/whoop off the returned id.
//   GET   ?id=<profileId>  -> that profile (restrictions parsed back to string[]).
//
// Validation is deliberately forgiving but typed: enum-ish fields are checked
// against the allowed sets (src/lib/types.ts), numbers are coerced and bounded,
// so a sloppy onboarding payload becomes a clean 400, never a 500.
import { db } from "@/lib/db";
import type { ActivityLevel, Goal, ProfileInput, Sex } from "@/lib/types";

const GOALS: Goal[] = ["build", "maintain", "cut", "perform"];
const SEXES: Sex[] = ["male", "female"];
const ACTIVITY: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "veryActive"];

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const inRange = (v: number, lo: number, hi: number) => v >= lo && v <= hi;

export async function POST(request: Request) {
  let body: Partial<ProfileInput>;
  try {
    body = (await request.json()) as Partial<ProfileInput>;
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const heightCm = num(body.heightCm);
  const weightKg = num(body.weightKg);
  const age = num(body.age);
  const restrictions = Array.isArray(body.restrictions)
    ? body.restrictions.filter((r): r is string => typeof r === "string")
    : [];

  const errors: string[] = [];
  if (!name) errors.push("name is required");
  if (!GOALS.includes(body.goal as Goal)) errors.push(`goal must be one of ${GOALS.join(", ")}`);
  if (!SEXES.includes(body.sex as Sex)) errors.push(`sex must be one of ${SEXES.join(", ")}`);
  if (!ACTIVITY.includes(body.activityLevel as ActivityLevel))
    errors.push(`activityLevel must be one of ${ACTIVITY.join(", ")}`);
  if (!inRange(heightCm, 120, 230)) errors.push("heightCm must be 120–230");
  if (!inRange(weightKg, 35, 230)) errors.push("weightKg must be 35–230");
  if (!inRange(age, 13, 100)) errors.push("age must be 13–100");
  if (errors.length) return Response.json({ error: errors.join("; ") }, { status: 400 });

  const profile = await db.profile.create({
    data: {
      name,
      goal: body.goal as Goal,
      heightCm,
      weightKg,
      age,
      sex: body.sex as Sex,
      activityLevel: body.activityLevel as ActivityLevel,
      restrictions: JSON.stringify(restrictions),
    },
  });

  // Echo back the input shape (restrictions as an array) plus the new id.
  return Response.json(
    { ...profile, restrictions: JSON.parse(profile.restrictions) as string[] },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) return Response.json({ error: `no profile '${id}'` }, { status: 404 });

  return Response.json({
    ...profile,
    restrictions: JSON.parse(profile.restrictions) as string[],
  });
}
