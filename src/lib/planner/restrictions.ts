// Restriction logic, ported from the mockup (lines 280–316, 433–454).
// `conflict()` is THE hard filter, on server and client (PLANNER_SPEC
// "Restrictions"). It fixes the LP filter's bugs: vegetarian keeps
// vegan-labeled items, halal applies to meat only, pescatarian works,
// unlabeled items are excluded for anyone with an allergy (fail closed),
// the typed-in "other" allergy matches dish names, and a gluten allergy
// excludes wheat.
import type { PlannerItem } from "./items";
import type { PlannerProfile } from "./context";

export const ALLERGENS: [string, string][] = [
  ['milk','Milk'],['egg','Egg'],['wheat','Wheat'],['gluten','Gluten'],['soy','Soy'],
  ['tree nut','Tree nuts'],['peanut','Peanuts'],['sesame','Sesame'],['shellfish','Shellfish'],['fish','Fish'],
];
export const MAJOR = ['milk','egg','wheat','soy','tree nut','peanut','sesame','shellfish','fish'];

/* The profile keeps ONE flat `restrictions` array (mirrors backend
   ProfileInput.restrictions): an optional diet value, zero or more allergen
   keys, 'halal' (CHANGE: now carried in restrictions too), and an optional
   free-text "other" allergy. These accessors read each part back out.
   "omnivore" is the absence of a diet value, so it is never stored. */
export const DIET_VALUES = new Set(['vegetarian', 'vegan', 'pescatarian']);
export const ALLERGEN_KEYS = new Set(ALLERGENS.map(a => a[0]));

export const dietOf = (p: PlannerProfile) =>
  (p.restrictions || []).find(r => DIET_VALUES.has(r)) || 'omnivore';
export const allergiesOf = (p: PlannerProfile) =>
  (p.restrictions || []).filter(r => ALLERGEN_KEYS.has(r));
// CHANGE: 'halal' lives in restrictions now, so it must not read as the
// free-text "other" allergy.
export const otherOf = (p: PlannerProfile) =>
  (p.restrictions || []).find(r => r !== 'halal' && !DIET_VALUES.has(r) && !ALLERGEN_KEYS.has(r)) || '';

/** Cross-contact disclaimer — must appear on every plate card (CLAUDE.md). */
export const XC = 'Allergen info comes from Dining Services. Cross-contact is possible, so confirm with staff.';

export const aName = (a: string) =>
  (ALLERGENS.find(x => x[0] === a) || [a, a])[1].toLowerCase();

/* Typical allergens for foods logged outside the Dining Center (Hackro
   estimates from the food's name). Used to warn on flex/custom logs. */
export const AGUESS: [string, RegExp][] = [
  ['peanut',/peanut|\bpb\b|pbj|pb&j|trail mix|snickers|candy bar|pad thai|satay/],
  ['tree nut',/almond|cashew|walnut|pecan|trail mix|nutella|pesto|\bnuts\b/],
  ['milk',/milk|cheese|latte|cappuccino|yogurt|parfait|ice cream|alfredo|quesadilla|nachos|cream|whey|protein shake|protein bar|chai|cocoa|hot chocolate|pizza|\bmac\b|butter|smoothie|muffin|croissant|pancake|waffle|donut|brownie|cookie|cheesesteak|caesar/],
  ['egg',/\begg|mayo|pancake|waffle|muffin|brownie|cookie|donut|french toast|croissant|caesar/],
  ['wheat',/bread|bagel|sandwich|hoagie|\bsub\b|pizza|pasta|spaghetti|fettuccine|burger|\bbun|wrap|tortilla|burrito|quesadilla|taco|muffin|donut|croissant|pancake|waffle|cereal|granola|pretzel|cookie|brownie|ramen|noodle|dumpling|potsticker|cracker|toast|pita|gyro|tender|mozzarella stick|cheesesteak|clif|protein bar|\bmac\b|orange chicken|blt|pb&j|pbj|caesar/],
  ['soy',/\bsoy|tofu|edamame|sushi|fried rice|orange chicken|dumpling|ramen|pad thai|protein bar|clif|teriyaki|poke/],
  ['sesame',/sesame|tahini|hummus|sushi|poke|bagel/],
  ['fish',/salmon|tuna|\bfish|sushi|poke|caesar/],
  ['shellfish',/shrimp|crab|lobster|california roll/],
];
export const guessAllergens = (t: string) =>
  AGUESS.filter(([, re]) => re.test(String(t).toLowerCase())).map(a => a[0]);

/** Does a list of allergens (labels or estimates) hit the user's allergies?
 * Returns readable names or []. */
export function userHits(list: string[], name = '', p: PlannerProfile): string[] {
  const al = allergiesOf(p); const out: string[] = []; const other = otherOf(p);
  for (const a of al) { if (a === 'gluten' ? list.includes('wheat') : list.includes(a)) out.push(aName(a)); }
  if (other && name && String(name).toLowerCase().includes(other.toLowerCase().trim())) out.push(other.toLowerCase().trim());
  return out;
}

/** What Dining Services labeled for a menu item. */
export function allergenState(it: PlannerItem): { state: 'contains' | 'none' | 'nodata'; list: string[] } {
  const contains = MAJOR.filter(a => it.tags.has(a));
  if (contains.length) return {state:'contains', list:contains};
  if (it.tags.size || it.station === 'Free Zone' || /FZ$|FreeZone/.test(it.name)) return {state:'none', list:[]};
  return {state:'nodata', list:[]};
}

/** Which rule an item breaks, or null if it fits the user. HARD filter. */
export function conflict(it: PlannerItem, p: PlannerProfile): string | null {
  const n = it.nut; const fl = (n && n[7]) || ''; const role = n ? n[6] : '';
  const al = allergiesOf(p); const diet = dietOf(p); const st = allergenState(it);
  if ((p.never || []).includes(it.name)) return 'On your never-again list';
  const hits = userHits(st.list, it.name, p); if (hits.length) return `Contains ${hits.join(', ')}`;
  if (al.includes('gluten') && st.state === 'none' && !it.tags.has('gluten free') && it.station !== 'Free Zone' && !/FZ$|FreeZone/.test(it.name)) return 'Not labeled gluten-free';
  if (al.includes('fish') && fl.includes('f') && !it.tags.has('shellfish')) return 'Contains fish';
  if ((al.length || otherOf(p)) && st.state === 'nodata') return 'No allergen data';
  if (diet === 'vegan') {
    const implicit = ['F','V'].includes(role) && !fl;
    if (!(it.tags.has('vegan') || implicit)) return 'Not vegan';
  }
  if (diet === 'vegetarian' && (fl.includes('m') || fl.includes('f') || it.tags.has('pork') || it.tags.has('shellfish'))) return 'Not vegetarian';
  if (diet === 'pescatarian' && (fl.includes('m') || it.tags.has('pork'))) return 'Not pescatarian';
  if (p.halal) {
    if (it.tags.has('pork')) return 'Contains pork';
    if (fl.includes('m') && !it.tags.has('halal')) return 'Not labeled halal';
  }
  return null;
}

export const fits = (it: PlannerItem, p: PlannerProfile) => !conflict(it, p);
