// USDA FoodData Central (FDC) nutrition lookup.
// The Swarthmore dining feed has no per-item macros (see scripts/scrape.ts
// TODO), so we fill them from USDA by food name: search FDC, take the best
// match, and read its per-100g calories/protein/carbs/fat.
//
// Values are PER 100g of the matched food. The dining feed gives us no gram
// serving size, so callers treat "one serving" as 100g unless they have a
// better portion. That's an estimate; we label it (`per: "100g"`) so the UI
// can be honest about it.
//
// Key: USDA_API_KEY (free, 1000 req/hr — https://fdc.nal.usda.gov/api-key-signup.html).
// Falls back to DEMO_KEY (~30 req/hr) so a missing key never hard-fails; the
// route degrades to null nutrition instead of throwing.

const FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

// Prefer whole-food reference data over noisy branded entries. Lower index =
// higher priority when the search returns a mix.
const DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"] as const;

// FDC `nutrientNumber` codes for the four macros we track.
const NUTRIENT_NUMBER = {
  calories: "208", // Energy (kcal)
  protein: "203",
  fat: "204",
  carbs: "205",
} as const;

const TIMEOUT_MS = 8000;

export interface UsdaNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** FDC food description we matched against. */
  match: string;
  fdcId: number;
  /** Basis for the numbers. Always per 100g from FDC today. */
  per: "100g";
}

interface FdcNutrient {
  nutrientNumber?: string;
  value?: number;
}
interface FdcFood {
  fdcId: number;
  description: string;
  dataType?: string;
  foodNutrients?: FdcNutrient[];
}

function apiKey(): string {
  return process.env.USDA_API_KEY || "DEMO_KEY";
}

// Dedupe lookups within a process: the weekly menu repeats many item names,
// and DEMO_KEY's rate limit is tiny. `null` = looked up, no match found.
const cache = new Map<string, UsdaNutrition | null>();
const normalize = (name: string) => name.trim().toLowerCase();

function readNutrient(food: FdcFood, nutrientNumber: string): number {
  const n = food.foodNutrients?.find((x) => x.nutrientNumber === nutrientNumber);
  return typeof n?.value === "number" ? n.value : 0;
}

// Round to 1 decimal so stored macros stay tidy without losing precision.
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Pick the match whose dataType we trust most; fall back to the first food. */
function bestFood(foods: FdcFood[]): FdcFood | undefined {
  if (foods.length === 0) return undefined;
  // Prefer the highest-priority DATA_TYPES tier that's present; else first.
  for (const t of DATA_TYPES) {
    const f = foods.find((x) => x.dataType === t);
    if (f) return f;
  }
  return foods[0];
}

/**
 * Look up per-100g macros for a food name. Returns null if there's no match
 * or the request fails — callers must handle null and never surface an error
 * to the demo.
 */
export async function lookupNutrition(name: string): Promise<UsdaNutrition | null> {
  const key = normalize(name);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${FDC_SEARCH_URL}?api_key=${encodeURIComponent(apiKey())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: name,
        dataType: [...DATA_TYPES],
        pageSize: 5,
        requireAllWords: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`FDC HTTP ${res.status}`);

    const json = (await res.json()) as { foods?: FdcFood[] };
    const food = bestFood(json.foods ?? []);
    if (!food) {
      cache.set(key, null);
      return null;
    }

    const protein = round1(readNutrient(food, NUTRIENT_NUMBER.protein));
    const carbs = round1(readNutrient(food, NUTRIENT_NUMBER.carbs));
    const fat = round1(readNutrient(food, NUTRIENT_NUMBER.fat));
    let calories = round1(readNutrient(food, NUTRIENT_NUMBER.calories));
    // Some FDC entries carry macros but no Energy (208) value, landing at 0
    // kcal. That misleads the solver's one guardrail — a calorie ceiling — so
    // a 0-kcal/high-protein item looks "free" and gets over-picked. Derive
    // calories from macros (Atwater: 4/4/9) when we have macros but no energy.
    if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
      calories = round1(protein * 4 + carbs * 4 + fat * 9);
    }

    const nutrition: UsdaNutrition = {
      calories,
      protein,
      carbs,
      fat,
      match: food.description,
      fdcId: food.fdcId,
      per: "100g",
    };
    cache.set(key, nutrition);
    return nutrition;
  } catch (err) {
    // Rate limit, network, or timeout: log and degrade to null. Do NOT cache
    // a transient failure, so a later retry can still succeed.
    console.warn(`USDA lookup failed for "${name}":`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
