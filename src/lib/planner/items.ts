// Menu items + the DB adapter, ported from the mockup (lines 403–432,
// 1680–1713, 1750–1786). `fromMenuItems(dbRows)` does what the mockup's
// bootstrapRealData did — but WITHOUT mutating the shared NUT/MENU tables
// (module-level mutation would leak between users on the server). Each
// PlannerItem carries its own nut array.
import { MENU, NUT, THEMES, mealById, type Nut, type MealSlot } from "./data";

export interface PlannerItem {
  name: string;
  tags: Set<string>;
  station: string;
  nut: Nut | null;
  theme: boolean;
  /** DB MenuItem id, so logging can point at the real row. */
  menuItemId?: string;
}

export interface Station {
  station: string;
  items: PlannerItem[];
}

/** Parsed menus per mealId — the shape menuFor() reads. */
export type MenuData = Record<string, Station[]>;

/** mockup mealId -> real DB {date, meal}. Snack (sat-s) reuses sat-b via `from`. */
export const API_MAP: Record<string, { date: string; meal: string }> = {
  'sat-b': {date:'2026-11-14', meal:'breakfast'},
  'sat-l': {date:'2026-11-14', meal:'lunch'},
  'sat-d': {date:'2026-11-14', meal:'dinner'},
  'sun-br':{date:'2026-11-15', meal:'brunch'},
  'sun-d': {date:'2026-11-15', meal:'dinner'},
  'sun-5': {date:'2026-11-15', meal:'latenight'}
};

/** Reverse of API_MAP: "date|meal" -> mealId. */
export const MEAL_ID_BY_DATE_MEAL: Record<string, string> = Object.fromEntries(
  Object.entries(API_MAP).map(([id, q]) => [`${q.date}|${q.meal}`, id]),
);

/* The real feed has only dietary[]/allergens[], not the mockup's role/flags.
   Derive them from the dish name + labels so the solver keeps working. */
export function guessRole(name: string): string {
  const n = name.toLowerCase();
  if (/cookie|brownie|cake|pie|donut|doughnut|pastry|muffin|scone|pudding|blondie|cheesecake|ice cream|cupcake|dessert|chocolate chip|strata/.test(n)) return 'S';
  if (/chicken|beef|steak|pork|sausage|bacon|turkey|\bham\b|shrimp|salmon|\bfish\b|tofu|lentil|shawarma|meatball|wings|tenders|burger|gyro|shrimp|ravioli/.test(n)) return 'P';
  if (/rice|pasta|cavatappi|potato|fries|bread|\bbun|waffle|pancake|oatmeal|grits|noodle|quinoa|tortilla|pita|bagel|hashbrown|tots|biscuit|cereal|granola|chickpea|cavatappi/.test(n)) return 'C';
  if (/yogurt|\beggs?\b|cheese|edamame|cottage/.test(n)) return 'D';
  if (/salad|lettuce|broccoli|green bean|asparagus|carrot|cucumber|tomato|cabbage|eggplant|spinach|kale|vegetable|zucchini|pepper|romaine|greens/.test(n)) return 'V';
  if (/fruit|melon|berry|berries|grape|apple|orange|banana|blueberr|grapefruit|applesauce|mango|craisin|raisin/.test(n)) return 'F';
  if (/sauce|dressing|syrup|honey|butter|jam|compote|salsa|chimichu|ragout|\bcream\b|gravy|aioli|mayo|seasoning|flakes|sugar|almond|coconut|scallion|bits|dip/.test(n)) return 'K';
  return 'X';
}

export function guessFlags(name: string, diet?: string[]): string {
  const d = (diet || []).map(x => String(x).toLowerCase());
  if (d.includes('vegan') || d.includes('vegetarian')) return '';
  const n = name.toLowerCase();
  if (/shrimp|salmon|tuna|\bfish\b|crab|lobster|shellfish/.test(n)) return 'f';
  if (/chicken|beef|steak|pork|sausage|bacon|turkey|\bham\b|lamb|\bmeat\b|wings|gyro|shawarma|pepperoni/.test(n)) return 'm';
  return '';
}

/** Parse one built-in MENU station string into items (mockup `parse`). */
export function parse(str: string, station: string): PlannerItem[] {
  return str.split(', ').map(x => {
    const tags = new Set([...x.matchAll(/::([^:]+)::/g)].map(m => m[1]));
    const name = x.replace(/::[^:]+::/g, '').trim();
    return {name, tags, station, nut: NUT[name] ? (NUT[name].slice() as Nut) : null, theme: THEMES.has(name)};
  }).filter(i => i.name);
}

/** Parse the whole built-in MENU source for one slot key. */
function parseBuiltin(srcKey: string): Station[] {
  const src = MENU[srcKey];
  if (!src) return [];
  return Object.entries(src).map(([st, str]) => ({station: st, items: parse(str, st)}));
}

/** The MenuItem row fields the adapter needs (dietary/allergens may arrive as
 * JSON strings straight from Prisma, or already decoded by /api/menu). */
export interface MenuItemRowLike {
  id: string;
  date: string;
  meal: string;
  station: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary: string[] | string;
  allergens: string[] | string;
}

const asList = (v: string[] | string): string[] => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v) as string[]; } catch { return []; }
};

/**
 * DB rows (demo dates) → Record<mealId, Station[]>, the same shape as
 * menuFor. Rows whose {date, meal} don't map are ignored. A slot with no
 * usable rows falls back to the built-in MENU (as in the mockup). Per row
 * (mockup bootstrapRealData 1750–1786):
 *  - If the name has a NUT entry, copy it; overwrite kcal/protein/carbs/fat
 *    with the DB values when DB calories > 0.
 *  - Else if DB calories > 0, build a new entry (qty 1 serving, guessed
 *    role/flags).
 *  - Else skip the item (no macros and no estimate).
 */
/** One DB row → PlannerItem (the bootstrapRealData per-row rules), or null
 * when the row has no macros and no NUT estimate. */
export function rowToPlannerItem(it: MenuItemRowLike): PlannerItem | null {
  const dietary = asList(it.dietary);
  const allergens = asList(it.allergens);
  const existing = NUT[it.name];
  const hasReal = it.calories > 0;
  let nut: Nut;
  if (existing) {
    nut = existing.slice() as Nut;
    if (hasReal) {
      nut[0] = Math.round(it.calories); nut[1] = Math.round(it.protein);
      nut[2] = Math.round(it.carbs); nut[3] = Math.round(it.fat);
    }
  } else if (hasReal) {
    nut = [Math.round(it.calories), Math.round(it.protein), Math.round(it.carbs), Math.round(it.fat),
      1, 'serving', guessRole(it.name), guessFlags(it.name, dietary)];
  } else {
    return null; // no macros and no estimate: the solver would drop it anyway
  }
  const tags = new Set([...dietary, ...allergens].map(l => String(l).toLowerCase()));
  return {
    name: it.name, tags, station: it.station || 'Menu', nut,
    theme: THEMES.has(it.name), menuItemId: it.id,
  };
}

export function fromMenuItems(rows: MenuItemRowLike[]): MenuData {
  const bySlot = new Map<string, Map<string, PlannerItem[]>>();
  for (const row of rows) {
    const id = MEAL_ID_BY_DATE_MEAL[`${row.date}|${row.meal}`];
    if (!id) continue;
    const item = rowToPlannerItem(row);
    if (!item) continue;
    const station = item.station;
    const stations = bySlot.get(id) ?? new Map<string, PlannerItem[]>();
    const list = stations.get(station) ?? [];
    list.push(item);
    stations.set(station, list);
    bySlot.set(id, stations);
  }

  const out: MenuData = {};
  for (const id of Object.keys(API_MAP)) {
    const stations = bySlot.get(id);
    if (stations && stations.size) {
      out[id] = [...stations.entries()].map(([station, items]) => ({station, items}));
    } else {
      out[id] = parseBuiltin(id); // built-in fallback, like the mockup
    }
  }
  return out;
}

/** Built-in menus only (no DB rows at all — e.g. unit tests offline). */
export function builtinMenus(): MenuData {
  const out: MenuData = {};
  for (const id of Object.keys(API_MAP)) out[id] = parseBuiltin(id);
  return out;
}

/** mockup menuFor(mealId): slot stations, honoring `from` + station filters. */
export function menuFor(menus: MenuData, mealId: string): Station[] {
  const m = mealById(mealId) as MealSlot | undefined;
  if (!m) return [];
  const src = m.from || mealId;
  const out: Station[] = [];
  for (const s of menus[src] ?? []) {
    if (m.stations && !m.stations.includes(s.station)) continue;
    out.push(s);
  }
  return out;
}

/** mockup itemsFor(mealId): unique named items that carry nutrition. */
export function itemsFor(menus: MenuData, mealId: string): PlannerItem[] {
  const seen = new Map<string, PlannerItem>();
  for (const s of menuFor(menus, mealId)) {
    for (const it of s.items) if (it.nut && !seen.has(it.name)) seen.set(it.name, it);
  }
  return [...seen.values()];
}

export function findItem(menus: MenuData, name: string, mealId: string): PlannerItem | null {
  for (const s of menuFor(menus, mealId)) {
    for (const it of s.items) if (it.name === name) return it;
  }
  return null;
}

export function stationsOf(menus: MenuData, name: string, mealId: string): string[] {
  return menuFor(menus, mealId).filter(s => s.items.some(i => i.name === name)).map(s => s.station);
}
