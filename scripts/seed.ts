// Seed the DB for the demo: load the menu snapshot, create a demo profile,
// a mock Whoop day, and a week of logged history for the week view.
// Run: npm run seed  (runs scrape first via the npm script)
//
// The week view uses this SEEDED history on purpose — we say so in the pitch
// (CLAUDE.md "OUT ... week view uses seeded demo history, and we say so").
import "dotenv/config"; // load DATABASE_URL before the Prisma client (db) reads it
import { db } from "../src/lib/db";

// Local YYYY-MM-DD, N days ago.
function ymd(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
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
  const items = await db.menuItem.findMany();
  if (items.length === 0) {
    console.warn("No menu items found — run `npm run scrape` first. Skipping log history.");
  } else {
    await db.logEntry.deleteMany({ where: { profileId: profile.id } });
    for (let d = 1; d <= 6; d++) {
      // 3-4 items per past day, spread across meals.
      const picks = items.slice(0, 4);
      for (const item of picks) {
        await db.logEntry.create({
          data: {
            profileId: profile.id,
            menuItemId: item.id,
            date: ymd(d),
            meal: item.meal,
            servings: 1 + (d % 2),
          },
        });
      }
    }
    console.log("Seeded 6 days of log history.");
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
