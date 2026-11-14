// Seed the DB for the demo: load the menu snapshot, create a demo profile,
// a mock Whoop day, and a week of logged history for the week view.
// Run: npm run seed  (runs scrape first via the npm script)
//
// The week view uses this SEEDED history on purpose — we say so in the pitch
// (CLAUDE.md "OUT ... week view uses seeded demo history, and we say so").
import "dotenv/config"; // load DATABASE_URL before the Prisma client (db) reads it
import { db } from "../src/lib/db";
import { localYmd } from "../src/lib/date";

// LOCAL YYYY-MM-DD, N days ago. Local (not UTC) so seeded dates match the
// date keys the whoop/menu/progress routes derive. See src/lib/date.ts.
function ymd(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return localYmd(d);
}

async function main() {
  // 1) Demo profile.
  const profile = await db.profile.upsert({
    where: { id: "demo-profile" },
    create: {
      id: "demo-profile",
      name: "Demo Student",
      goal: "build",
      heightCm: 178,
      weightKg: 75,
      age: 20,
      sex: "male",
      activityLevel: "active",
      restrictions: JSON.stringify([]),
    },
    update: {},
  });
  console.log(`Profile: ${profile.name} (${profile.id})`);

  // 2) Mock Whoop day (today) — high strain, mid recovery.
  await db.whoopDay.upsert({
    where: { profileId_date: { profileId: profile.id, date: ymd(0) } },
    create: { profileId: profile.id, date: ymd(0), recovery: 55, strain: 15.2, mock: true },
    update: { recovery: 55, strain: 15.2, mock: true },
  });

  // 3) A week of logged history. Reuse today's menu items as stand-ins;
  //    LogEntry.date carries the historical day.
  // Use ENRICHED items only (calories > 0) so the week view shows real
  // progress, not zeros. Items with 0 macros are unenriched menu rows —
  // run `/api/nutrition?date=...` (USDA) to fill them in first.
  const enriched = await db.menuItem.findMany({ where: { calories: { gt: 0 } } });
  if (enriched.length === 0) {
    console.warn(
      "No enriched menu items (all macros 0) — run the scraper + /api/nutrition first. Skipping log history.",
    );
  } else {
    // A realistic day: up to 2 items from each meal.
    const fromMeal = (meal: string) =>
      enriched.filter((i) => i.meal === meal).slice(0, 2);
    const picks = [
      ...fromMeal("breakfast"),
      ...fromMeal("lunch"),
      ...fromMeal("dinner"),
    ];
    await db.logEntry.deleteMany({ where: { profileId: profile.id } });
    const data = [];
    for (let d = 1; d <= 6; d++) {
      for (const item of picks) {
        data.push({
          profileId: profile.id,
          menuItemId: item.id,
          date: ymd(d),
          meal: item.meal,
          servings: 1 + (d % 2),
        });
      }
    }
    await db.logEntry.createMany({ data });
    console.log(`Seeded 6 days of log history (${picks.length} items/day, enriched).`);
  }

  console.log("Seed complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
