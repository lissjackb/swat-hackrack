// Scrape today's (+7 day) Swarthmore Dining Center menu into SQLite.
// Run: npm run scrape
//
// SOURCE (reverse-engineered from dash.swarthmore.edu/menu/dining-center/):
// The Gatsby page fetches a GraphQL feed at runtime. We hit it directly:
//
//   POST https://dash.swarthmore.edu/graphql
//   query { cbordnetmenufeed(calendarId:"DCC", order:ASC, timeMin, timeMax) {
//     data { id title description startdate enddate status } } }
//
// - Each `data` entry is ONE meal (title = Breakfast/Lunch/Dinner/Brunch/…).
// - `description` is HTML: <span class="font-bold">Station</span>
//     <ul><li>Item ::label::, Item ::label::…</li></ul>
// - `::label::` tags are dietary (vegan/vegetarian/gluten free/halal/kosher)
//   or allergens (milk/egg/soy/wheat/peanut/tree nut/fish/shellfish/sesame/
//   pork/alcohol).
//
// NOTE: this feed has NO per-item nutrition. calories/protein/carbs/fat are
// left at 0 here — see TODO at the bottom. If live fetch fails we fall back
// to data/menu-snapshot.json (CLAUDE.md: a live scraper is not what wins points).
import "dotenv/config"; // load DATABASE_URL before the Prisma client (db) reads it
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { db } from "../src/lib/db";

const GRAPHQL_URL = "https://dash.swarthmore.edu/graphql";
const CALENDAR_ID = "DCC"; // Dining Center. (Other locations use Google Calendar feeds.)

const MENU_QUERY = `query($calendarId:String!,$order:SortOrder,$timeMin:String,$timeMax:String){
  cbordnetmenufeed(calendarId:$calendarId,order:$order,timeMin:$timeMin,timeMax:$timeMax){
    calendarId calendarName
    data{ id title description startdate enddate allday status }
  }
}`;

// ---- label vocabulary ----------------------------------------------------
// Dietary labels (positive attributes) vs allergens (things to avoid).
const DIETARY_LABELS = new Set([
  "vegan",
  "vegetarian",
  "gluten free",
  "halal",
  "kosher",
]);
// Title-case a raw lowercased label for display/storage.
const titleCase = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

// Meal title -> normalized meal slug used across the app.
function normalizeMeal(title: string): string {
  const t = title.trim().toLowerCase();
  if (t === "breakfast") return "breakfast";
  if (t === "brunch") return "brunch";
  if (t === "lunch") return "lunch";
  if (t === "dinner") return "dinner";
  if (t === "mid day munches") return "snack";
  if (t === "5th meal") return "latenight";
  return t.replace(/[^a-z0-9]+/g, "-");
}

// ---- types the scraper produces -----------------------------------------
interface ParsedItem {
  meal: string;
  station: string | null;
  name: string;
  dietary: string[];
  allergens: string[];
}

interface FeedEntry {
  id: string;
  title: string;
  description: string | null;
  startdate: string;
  enddate: string;
  status: string;
}

/**
 * Parse one meal's HTML description into items with station + labels.
 * Exported so it can be unit-tested against captured fixtures.
 */
export function parseDescription(html: string, meal: string): ParsedItem[] {
  const $ = cheerio.load(html);
  const items: ParsedItem[] = [];

  $("span.font-bold").each((_, el) => {
    const station = $(el).text().trim() || null;
    // The item list is the <ul> immediately following the station <span>.
    const ul = $(el).nextAll("ul").first();
    // Flatten any <li>s to a single comma-separated string.
    const listText = ul
      .find("li")
      .map((_, li) => $(li).text())
      .get()
      .join(", ");

    for (const raw of listText.split(",")) {
      const segment = raw.trim();
      if (!segment) continue;

      // Pull out ::label:: tags, then strip them from the name.
      const labels = (segment.match(/::([^:]+)::/g) ?? []).map((m) =>
        m.replace(/::/g, "").trim().toLowerCase(),
      );
      const name = segment.replace(/::[^:]+::/g, "").trim();
      if (!name) continue;

      const dietary: string[] = [];
      const allergens: string[] = [];
      for (const label of labels) {
        if (DIETARY_LABELS.has(label)) dietary.push(titleCase(label));
        else allergens.push(titleCase(label));
      }
      items.push({ meal, station, name, dietary, allergens });
    }
  });

  return items;
}

/** Local YYYY-MM-DD, N days from today. */
function ymd(daysFromToday = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

/** Hit the live GraphQL feed. Returns null to signal "fall back to snapshot". */
async function fetchLive(): Promise<{ date: string; items: ParsedItem[] }[] | null> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: MENU_QUERY,
        variables: {
          calendarId: CALENDAR_ID,
          order: "ASC",
          timeMin: ymd(0),
          timeMax: ymd(7),
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      data?: { cbordnetmenufeed?: { data?: FeedEntry[] } };
      errors?: unknown;
    };
    const entries = json.data?.cbordnetmenufeed?.data;
    if (!entries?.length) throw new Error("no feed entries");

    // Group parsed items by local date.
    const byDate = new Map<string, ParsedItem[]>();
    for (const entry of entries) {
      if (!entry.description) continue;
      const date = entry.startdate.slice(0, 10); // local Swat date (offset baked in)
      const meal = normalizeMeal(entry.title);
      const parsed = parseDescription(entry.description, meal);
      const bucket = byDate.get(date) ?? [];
      bucket.push(...parsed);
      byDate.set(date, bucket);
    }
    return [...byDate.entries()].map(([date, items]) => ({ date, items }));
  } catch (err) {
    console.warn(`Live feed failed (${(err as Error).message}); using snapshot.`);
    return null;
  }
}

/** Snapshot fallback: today's menu captured by hand (CLAUDE.md). */
async function loadSnapshot(): Promise<{ date: string; items: ParsedItem[] }[]> {
  const raw = await readFile(join(process.cwd(), "data", "menu-snapshot.json"), "utf8");
  const parsed = JSON.parse(raw) as {
    date: string;
    items: (ParsedItem & { calories?: number })[];
  };
  return [
    {
      date: parsed.date,
      items: parsed.items.map((i) => ({
        meal: i.meal,
        station: i.station ?? null,
        name: i.name,
        dietary: i.dietary ?? [],
        allergens: i.allergens ?? [],
      })),
    },
  ];
}

async function upsertDay(date: string, items: ParsedItem[]) {
  for (const it of items) {
    await db.menuItem.upsert({
      where: { date_meal_name: { date, meal: it.meal, name: it.name } },
      create: {
        date,
        meal: it.meal,
        station: it.station,
        name: it.name,
        // TODO(nutrition): this feed has no macros. Fill calories/protein/
        // carbs/fat from NetNutrition or an estimate (see chat decision).
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        dietary: JSON.stringify(it.dietary),
        allergens: JSON.stringify(it.allergens),
      },
      update: {
        station: it.station,
        dietary: JSON.stringify(it.dietary),
        allergens: JSON.stringify(it.allergens),
      },
    });
  }
}

async function main() {
  const live = await fetchLive();
  const days = live ?? (await loadSnapshot());
  const total = days.reduce((n, d) => n + d.items.length, 0);
  console.log(
    `Loading ${total} items across ${days.length} day(s) (${live ? "live" : "snapshot"}).`,
  );
  for (const { date, items } of days) {
    await upsertDay(date, items);
    console.log(`  ${date}: ${items.length} items`);
  }
  console.log("Done.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
