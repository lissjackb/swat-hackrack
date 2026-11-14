// The whole-day planner, ported from the mockup (lines 474–717, 730–752).
// Template ranking (rank) → greedy portion balancing in real serving steps
// (balance/augment) → re-plan of the not-yet-eaten rest of the day
// (rebalance). Ported exactly per docs/PORT_PLAN.md rule 6 — don't "improve"
// it. The only changes are the ones PLANNER_SPEC marks CHANGE.
//
// Globals → explicit inputs: every function that read the mockup's `S` takes
// the menus + PlanContext captured by createEngine. The caches (CACHE
// equivalent, RANK, BASE) live inside the closure, never at module level —
// module-level caches would be shared across users on the server.
import { MEALS, mealById, fmt, type MealSlot } from "./data";
import { fits as fitsP } from "./restrictions";
import { itemsFor as itemsForData, findItem as findItemData, menuFor as menuForData, stationsOf as stationsOfData, type MenuData, type PlannerItem } from "./items";
import { targets as targetsOf, rangeK as rangeKOf, type PlannerTargets } from "./targets";
import { has, type MacroSum, type PlanContext } from "./context";

export interface Part {
  it: PlannerItem;
  m: number;
  pick?: number;
  orig?: number;
  added?: boolean;
  user?: boolean;
  from?: string;
  /** Backref used by augment's per-meal budgeting. Internal. */
  _x?: MealPlan;
}

export interface Ranked {
  parts: Part[];
  t: MacroSum;
  err: number;
  main: string;
}

export interface MealPlan {
  m: MealSlot;
  tgt: { k: number; p: number };
  ranked: Ranked[];
  pick?: Ranked | null;
  parts: Part[];
  tot: MacroSum;
  baseTot?: MacroSum;
  removed?: string[];
  locked?: boolean;
  origK?: number;
  deltaK?: number;
  deltaP?: number;
  trimmed?: boolean;
  boosted?: boolean;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

export function sumParts(parts: Part[]): MacroSum {
  const t = {k:0, p:0, c:0, f:0};
  for (const x of parts) { const n = x.it.nut!; t.k += n[0]*x.m; t.p += n[1]*x.m; t.c += n[2]*x.m; t.f += n[3]*x.m; }
  return t;
}

const VOLU = new Set(['cup','cups','oz','tbsp','tsp','serving']);
const BK = new Set(['Oatmeal','Pumpkin Spice Overnight Oats','Granola FZ','Granola','French Toast Sticks','Waffles','Breakfast Bread','Chocolate Chip Waffles FZ']);

/**
 * Rank realistic plates (main + carb + side + optional extra) for one meal
 * kind over pre-filtered items. Pure: no ctx. The closure's rank(mealId, …)
 * applies the fits() filter first; /api/recommend calls this directly.
 */
export function rankItems(kind: string, its: PlannerItem[], tgt: {k: number; p: number}, seed = 0): Ranked[] {
  const by = (...r: string[]) => its.filter(i => r.includes(i.nut![6]));
  let mains: PlannerItem[], carbs: (PlannerItem | null)[], sides: (PlannerItem | null)[], extras: (PlannerItem | null)[];
  if (kind === 'snack') { mains = by('D'); carbs = [null]; sides = by('F'); extras = [null]; }
  else {
    mains = by('P','X'); carbs = by('C');
    sides = kind === 'breakfast' ? [...by('F'), ...by('V')] : [...by('V'), ...by('F')];
    extras = [null, ...by('D')];
  }
  if (!mains.length && kind !== 'snack') mains = by('C');
  if (!mains.length) return [];
  if (!sides.length) sides = [null];
  const mults = (it: PlannerItem, list: number[]) =>
    list.filter(k => VOLU.has(it.nut![5]) || Number.isInteger(it.nut![4] * k));
  const out: Ranked[] = [];
  for (const main of mains) {
    const isX = main.nut![6] === 'X';
    const mm = mults(main, isX ? (main.nut![5] === 'slice' ? [1,2,3] : [1,1.5,2]) : [1,1.5,2,2.5]);
    const cs = isX ? [null, ...carbs] : (carbs.length ? carbs : [null]);
    for (const a of mm) for (const c of cs) {
      if (c && c.name === main.name) continue;
      const cms = c ? mults(c, [0.5,1,1.5,2]) : [0];
      for (const b of cms) for (const sd of sides) for (const ex of extras) {
        if (ex && ex.name === main.name) continue;
        const parts: Part[] = [{it: main, m: a}];
        if (c) parts.push({it: c, m: b});
        if (sd) parts.push({it: sd, m: 1});
        if (ex) parts.push({it: ex, m: 1});
        const t = sumParts(parts);
        let err = Math.abs(t.k - tgt.k)/tgt.k + 1.6*Math.max(0, tgt.p - t.p)/tgt.p + 0.5*Math.max(0, t.p - tgt.p*1.35)/tgt.p;
        if (c && c.nut![6]==='C' && main.nut![6]==='X' && b > 1) err += .05;
        if (c && kind === 'meal' && BK.has(c.name)) err += .15;
        if (seed) err += hash(main.name + (c ? c.name : '') + seed) * 0.35;
        out.push({parts, t, err, main: main.name});
      }
    }
  }
  out.sort((x, y) => x.err - y.err);
  const best: Ranked[] = []; const used = new Set<string>();
  for (const o of out) { if (used.has(o.main)) continue; used.add(o.main); best.push(o); if (best.length >= 6) break; }
  return best;
}

// ---- portion helpers (mockup 534–543, 660–661, 677, 730–752) --------------

export function stepOf(it: PlannerItem): number {
  return VOLU.has(it.nut![5]) ? 0.5 : 1 / it.nut![4];
}

function boundsOf(pp: Part): [number, number] {
  const r = pp.it.nut![6]; const s = stepOf(pp.it); const pk = pp.pick || pp.m || s;
  if (pp.user) return [pp.m, pp.m];
  const min = ['P','X','D'].includes(r) ? Math.max(s, Math.round(pk*0.5/s)*s) : 0;
  let max = Math.max(pk*2, s*2);
  max = Math.min(max, Math.max(pk, Math.floor(650 / pp.it.nut![0] / s) * s));
  if (/egg/i.test(pp.it.name)) max = Math.min(max, 4 / pp.it.nut![4]);
  if (['K','S'].includes(r)) max = Math.max(pk, s);
  if (['V','F'].includes(r)) max = Math.max(pk*2, s);
  return [min, Math.max(min, max)];
}

/** Nudge portions (in real serving steps) until the day lands within ±3% of
 * the kcal target with protein ≥ target, or reports the closest the menu
 * allows. mtg = per-meal kcal budgets when balancing across meals. */
function balance(parts: Part[], T: PlannerTargets, fixed: MacroSum, mtg?: Map<MealPlan, number> | null): MacroSum {
  const tot = () => { const t = sumParts(parts); t.k += fixed.k; t.p += fixed.p; t.c += fixed.c; t.f += fixed.f; return t; };
  const hi = T.kcal * 1.03, lo = T.kcal * 0.97;
  let MK = new Map<MealPlan, number>();
  type Cand = { pp: Part; nm: number; dk: number; dp: number };
  const cand = (pp: Part, dir: number): Cand | null => {
    const s = stepOf(pp.it), [mn, mx] = boundsOf(pp); const nm = +(pp.m + dir*s).toFixed(4);
    if (nm < mn - 1e-6 || nm > mx + 1e-6) return null;
    const dk = pp.it.nut![0]*s*dir;
    if (mtg && dir < 0 && pp._x && mtg.has(pp._x) && (MK.get(pp._x) || 0) + dk < 0.6 * mtg.get(pp._x)!) return null;
    return {pp, nm, dk, dp: pp.it.nut![1]*s*dir};
  };
  const mealGap = () => { const g = new Map<MealPlan, number>(); if (!mtg) return g; for (const [x, tg] of mtg) g.set(x, sumParts(x.parts).k - tg); return g; };
  const byMeal = (list: Cand[], sign: number) => {
    if (!mtg || !list.length) return list;
    const g = mealGap(); let best: MealPlan | null = null, bv = -Infinity;
    for (const c of list) { const v = sign * (g.get(c.pp._x!) || 0); if (v > bv) { bv = v; best = c.pp._x!; } }
    const sub = list.filter(c => c.pp._x === best); return sub.length ? sub : list;
  };
  for (let i = 0; i < 500; i++) {
    const t = tot(); let mv: Cand | null = null;
    if (mtg) { MK = new Map(); for (const [x] of mtg) MK.set(x, sumParts(x.parts).k); }
    const ups = parts.map(pp => cand(pp, 1)).filter(Boolean) as Cand[];
    const downs = parts.map(pp => cand(pp, -1)).filter(Boolean) as Cand[];
    if (t.k > hi) {
      const ok = downs.filter(d => t.p >= T.p ? t.p + d.dp >= T.p - 1e-6 : (-d.dp / -d.dk) < 0.05);
      mv = byMeal(ok.length ? ok : downs, 1).sort((a, b) => (a.dp/a.dk) - (b.dp/b.dk))[0] || null;
    } else if (t.p < T.p - 0.5) {
      const pu = ups.filter(u => u.dp > 0 && u.dp / u.dk >= 0.06).sort((a, b) => (b.dp/b.dk) - (a.dp/a.dk));
      const fitsIn = byMeal(pu.filter(u => t.k + u.dk <= hi), -1).sort((a, b) => (b.dp/b.dk) - (a.dp/a.dk))[0];
      if (fitsIn) mv = fitsIn;
      else if (pu.length) {
        const room = byMeal(downs.filter(d => (d.dp/d.dk) < (pu[0].dp/pu[0].dk) * 0.5), 1).sort((a, b) => (a.dp/a.dk) - (b.dp/b.dk))[0];
        if (room) mv = room;
      }
    }
    if (!mv && t.k < lo) {
      const pref = (r: string) => ({C:0, X:1, F:2, P:3, D:3, V:4} as Record<string, number>)[r] ?? 5;
      mv = byMeal(ups.filter(u => t.k + u.dk <= hi + 20), -1).sort((a, b) => pref(a.pp.it.nut![6]) - pref(b.pp.it.nut![6]) || a.pp.m - b.pp.m)[0] || null;
    }
    if (!mv) break;
    mv.pp.m = mv.nm;
  }
  return tot();
}

const BKC = BK; // same breakfast-carb set, mockup line 576

export const famOf = (n: string) => /egg/i.test(n) ? 'egg' : n;

export const snapM = (it: PlannerItem, m: number): number => {
  const n = it.nut!;
  if (VOLU.has(n[5])) return Math.floor(m*4 + 1e-6)/4;
  return Math.floor(n[4]*m + 1e-6)/n[4];
};

export const multsFor = (it: PlannerItem, list: number[]) =>
  list.filter(k => VOLU.has(it.nut![5]) || Number.isInteger(it.nut![4] * k));

// ---- display helpers (mockup 730–752) --------------------------------------

export function qty(n: number, unit: string): string {
  const v = Math.round(n * 2) / 2;
  const s = Number.isInteger(v) ? String(v) : (v === 0.5 ? '½' : v === 0.25 ? '¼' : String(v).replace('.5','½'));
  const sing: Record<string, string> = {slice:'slices',waffle:'waffles',donut:'donuts',pastry:'pastries',sandwich:'sandwiches',burger:'burgers',pita:'pitas',scone:'scones',muffin:'muffins',biscuit:'biscuits',potato:'potatoes',link:'links',bar:'bars',cupcake:'cupcakes',cookie:'cookies',bun:'buns',square:'squares',piece:'pieces',cup:'cups',serving:'servings',grapefruit:'grapefruit'};
  const one: Record<string, string> = {eggs:'egg',links:'link',slices:'slice',patties:'patty',sticks:'stick',tenders:'tender',spears:'spear',wings:'wing',tots:'tot',cups:'cup'};
  const u = v > 1 && sing[unit] ? sing[unit] : (v <= 1 && one[unit] ? one[unit] : unit);
  return `${s} ${u}`;
}

export function partText(x: Part): string { const n = x.it.nut!; return qty(n[4]*x.m, n[5]); }

export function dispName(it: PlannerItem): string {
  const n = it.name;
  if (/ FZ$/.test(n)) return n.replace(/ FZ$/, '') + (it.tags.has('vegan') && /cheese|pizza/i.test(n) ? ' (vegan cheese · Free Zone)' : ' (Free Zone)');
  if (/FreeZone$/.test(n)) return n.replace(/Homesfries/, 'Home fries').replace(/ ?FreeZone$/, '') + ' (Free Zone)';
  return n;
}
export const shortName = (it: PlannerItem) => dispName(it).replace(/ \(.*\)$/, '');
export const titleName = (it: PlannerItem) => dispName(it).replace(' · Free Zone', '').replace(' (Free Zone)', '');

// ---- the per-(menus, ctx) engine -------------------------------------------

export interface PlanStatus {
  t: { k: number; p: number };
  T: PlannerTargets;
  dk: number;
  ok: boolean;
  msg: string;
}

/**
 * Build the planner closure for one menus + context pair. The RANK/BASE
 * caches live here (mockup cache keys kept, plus the Whoop snapshot — the
 * adjustment now depends on its values, not just on/off).
 */
export function createEngine(menus: MenuData, ctx: PlanContext) {
  const RANK: Record<string, MealPlan[]> = {};
  const BASE: Record<string, MealPlan[]> = {};

  const fits = (it: PlannerItem) => fitsP(it, ctx.p);
  const T = () => targetsOf(ctx);
  const itemsFor = (mealId: string) => itemsForData(menus, mealId);
  const findItem = (name: string, mealId: string) => findItemData(menus, name, mealId);
  const isNever = (n: string) => (ctx.p.never || []).includes(n);

  function mealsOfDay(day: string): MealSlot[] {
    return MEALS.filter(m => m.day === day && (!m.opt || (ctx.p as unknown as Record<string, unknown>)[m.opt]));
  }
  function shareOf(m: MealSlot): number {
    const ms = mealsOfDay(m.day); const tot = ms.reduce((a, x) => a + x.share, 0);
    return m.share / tot;
  }

  function rank(mealId: string, tgt: {k: number; p: number}, seed = 0): Ranked[] {
    const m = mealById(mealId)!;
    return rankItems(m.kind, itemsFor(mealId).filter(fits), tgt, seed);
  }

  /** If portions alone can't reach the target, add up to 3 more dishes. */
  function augment(meals: MealPlan[], Tg: PlannerTargets, fixed: MacroSum, canAdj: (x: MealPlan) => boolean, flagAdded: boolean): MacroSum | null {
    let t: MacroSum | undefined;
    for (let i = 0; i < 4; i++) {
      const ups = meals.filter(canAdj); if (!ups.length) return null;
      const shareSum = ups.reduce((a, x) => a + (x.tgt ? x.tgt.k : 1), 0);
      const budget = Math.max(0, Tg.kcal - fixed.k);
      const mtg = new Map(ups.map(x => [x, budget * (x.tgt ? x.tgt.k : 1) / shareSum] as [MealPlan, number]));
      ups.forEach(x => x.parts.forEach(pp => { pp._x = x; }));
      t = balance(ups.flatMap(x => x.parts), Tg, fixed, mtg);
      const kShort = t.k < Tg.kcal * 0.97, pShort = t.p < Tg.p - 0.5;
      if ((!kShort && !pShort) || i === 3) break;
      const used = new Set(meals.flatMap(x => x.parts.map(pp => pp.it.name)));
      let best: { x: MealPlan; it: PlannerItem; score: number } | null = null;
      for (const x of ups) {
        if (x.m.kind === 'snack') continue;
        for (const it of itemsFor(x.m.id)) {
          if (!fits(it) || used.has(it.name)) continue;
          const r = it.nut![6]; const n = it.nut!;
          if (!['P','C','X','D'].includes(r) || (x.m.kind === 'meal' && BKC.has(it.name))) continue;
          if (meals.reduce((a, y) => a + y.parts.filter(pp => famOf(pp.it.name) === famOf(it.name)).length, 0) >= (famOf(it.name) === 'egg' ? 1 : 2)) continue;
          const dens = n[1] / Math.max(n[0], 1);
          const score = pShort ? dens : (r === 'C' ? 2 : 1) + dens;
          if (!best || score > best.score) best = {x, it, score};
        }
      }
      if (!best) break;
      best.x.parts.push({it: best.it, m: 1, pick: 1, orig: 0, added: !!flagAdded});
    }
    return t ?? null;
  }

  function applySwaps(meals: MealPlan[]): MealPlan[] {
    const cnt: Record<string, number> = {};
    const okV = (parts: Part[]) => parts.every(pp => { const k = famOf(pp.it.name); return (cnt[k] || 0) < (k === 'egg' ? 1 : 2); });
    return meals.map(x => {
      let pick = x.ranked.find(r => okV(r.parts)) || x.ranked[0];
      const sw = ctx.swaps[x.m.id];
      if (sw) { const f = x.ranked.find(r => r.main === sw); if (f) pick = f; }
      if (pick) pick.parts.forEach(pp => { const k = famOf(pp.it.name); cnt[k] = (cnt[k] || 0) + 1; });
      if (!pick) return {...x, pick: null, parts: [], tot: {k:0,p:0,c:0,f:0}};
      const isw = ctx.itemSwaps[x.m.id] || {};
      const parts = pick.parts.map(pp => {
        const r = isw[pp.it.name]; if (!r || isNever(r.name)) return pp;
        const it = findItem(r.name, x.m.id); return it ? {it, m: r.m, from: pp.it.name} : pp;
      });
      for (const a of ((ctx.adds || {})[x.m.id] || [])) {
        const it = findItem(a.name, x.m.id);
        if (it && !isNever(a.name) && !parts.some(pp => pp.it.name === a.name)) parts.push({it, m: a.m, user: true});
      }
      return {...x, pick, parts, tot: sumParts(parts)};
    });
  }

  function baseline(day: string): MealPlan[] {
    const Tg = T();
    // Mockup cache keys + the Whoop snapshot (the adjustment reads its values).
    const key = JSON.stringify([day, ctx.p, has(ctx, 'recovery'), ctx.seed, ctx.whoop]);
    if (!RANK[key]) {
      const ok = mealsOfDay(day).filter(m => rank(m.id, {k:500, p:30}).length);
      const tot = ok.reduce((a, m) => a + m.share, 0);
      RANK[key] = ok.map(m => {
        const sh = m.share / tot; const tgt = {k: Tg.kcal*sh, p: Tg.p*sh};
        return {m, tgt, ranked: rank(m.id, tgt, ctx.seed[m.id] || 0), parts: [], tot: {k:0,p:0,c:0,f:0}};
      });
    }
    const bkey = key + JSON.stringify([ctx.swaps, ctx.itemSwaps, ctx.adds || {}]);
    if (!BASE[bkey]) {
      const meals = applySwaps(RANK[key]).map(x => ({...x, parts: x.parts.map(pp => ({...pp, pick: pp.m}))}));
      augment(meals, Tg, {k:0, p:0, c:0, f:0}, () => true, false);
      BASE[bkey] = meals.map(x => {
        const parts = x.parts.filter(pp => pp.m > 0).map(pp => ({...pp, orig: pp.m, added: false}));
        return {...x, parts, tot: sumParts(parts), baseTot: sumParts(parts)};
      }).filter(x => x.parts.length);
    }
    return BASE[bkey].map(x => ({...x, parts: x.parts.map(pp => ({...pp}))}));
  }

  const ateSet = (id: string) => new Set(ctx.ate[id] || []);
  const eatenParts = (x: MealPlan) => { const a = ateSet(x.m.id); return x.parts.filter(pp => a.has(pp.it.name)); };
  const isFlex = (x: MealPlan) => !!(ctx.flex && ctx.flex[x.m.id]);
  const mealDone = (x: MealPlan) => isFlex(x) || !!ctx.done[x.m.id] || (x.parts.length > 0 && eatenParts(x).length === x.parts.length);
  const skipped = (x: MealPlan) => x.parts.length - eatenParts(x).length;
  const mealStarted = (x: MealPlan) => eatenParts(x).length > 0;
  const isUp = (x: MealPlan) => !mealStarted(x) && !ctx.done[x.m.id] && !(ctx.flex && ctx.flex[x.m.id]);

  function lockApply(x: MealPlan): MealPlan {
    const L = ctx.locked[x.m.id]; if (!L) return x;
    const parts = L.parts
      ? L.parts.map(q => { const it = findItem(q.name, x.m.id); return it ? {it, m: q.m, orig: q.orig, added: q.added, from: q.from} as Part : null; }).filter(Boolean) as Part[]
      : x.parts.filter(pp => !(L.removed || []).includes(pp.it.name)).map(pp => L.mults![pp.it.name] != null ? {...pp, m: L.mults![pp.it.name], orig: L.orig && L.orig[pp.it.name]} : pp);
    return {...x, parts, removed: L.removed || [], tot: sumParts(parts), locked: true};
  }

  function eatenFixed(meals: MealPlan[]): MacroSum {
    const t = {k: 0, p: 0, c: 0, f: 0};
    for (const e of ctx.extras) { t.k += e.k; t.p += e.p; t.c += e.c; t.f += e.f; }
    for (const x of meals) {
      if (isUp(x)) continue;
      const fx = ctx.flex && ctx.flex[x.m.id];
      const s = fx ? fx : mealDone(x) ? sumParts(eatenParts(x)) : sumParts(x.parts);
      t.k += s.k; t.p += s.p; t.c += s.c; t.f += s.f;
    }
    return t;
  }

  function rebalance(meals: MealPlan[]): MealPlan[] {
    const Tg = T();
    meals = meals.map(lockApply);
    const anything = ctx.extras.length || meals.some(x => !isUp(x));
    if (!anything) return meals;
    const fixed = eatenFixed(meals);
    meals = meals.map(x => isUp(x) ? {...x, parts: x.parts.map(pp => ({...pp}))} : x);
    augment(meals, Tg, fixed, isUp, true);
    return meals.map(x => {
      if (!isUp(x)) return x;
      const removed = x.parts.filter(pp => pp.m <= 0).map(pp => pp.it.name);
      const ps = x.parts.filter(pp => pp.m > 0);
      const tot = sumParts(ps); const deltaK = tot.k - x.baseTot!.k;
      return {...x, parts: ps, removed, tot, origK: x.baseTot!.k, deltaK, deltaP: tot.p - x.baseTot!.p, trimmed: deltaK < -25, boosted: deltaK > 25};
    });
  }

  function plan(day: string): MealPlan[] {
    const meals = baseline(day);
    return day === ctx.now.day ? rebalance(meals) : meals;
  }

  function dayTotals(day: string, onlyEaten?: boolean): MacroSum {
    const t = {k:0, p:0, c:0, f:0};
    for (const x of plan(day)) {
      const s = onlyEaten && isFlex(x) ? ctx.flex[x.m.id] : sumParts(onlyEaten ? eatenParts(x) : x.parts);
      t.k += s.k; t.p += s.p; t.c += s.c; t.f += s.f;
    }
    // Extras are logged against today (the mockup hard-codes 'sat' = NOW.day).
    if (onlyEaten && day === ctx.now.day) for (const e of ctx.extras) { t.k += e.k; t.p += e.p; t.c += e.c; t.f += e.f; }
    return t;
  }

  function dayProjection(): { t: MacroSum; msg: string } {
    const pl = plan(ctx.now.day); const Tg = T(); const t = eatenFixed(pl.map(x => x));
    for (const x of pl) if (isUp(x)) { t.k += x.tot.k; t.p += x.tot.p; }
    const dk = t.k - Tg.kcal; const msgs: string[] = [];
    if (Math.abs(dk) > Tg.kcal * 0.05) msgs.push(`${dk > 0 ? '+' : '−'}${fmt(Math.abs(dk))} kcal ${dk > 0 ? 'over' : 'under'} target`);
    if (t.p < Tg.p - 0.5) msgs.push(`${Math.round(Tg.p - t.p)} g protein short`);
    return {t, msg: msgs.length ? `Closest today's menu allows: ${msgs.join(', ')}.` : ''};
  }

  function planStatus(day: string): PlanStatus {
    const Tg = T(); const pl = baseline(day); const t = {k: 0, p: 0};
    pl.forEach(x => { t.k += x.tot.k; t.p += x.tot.p; });
    const dk = t.k - Tg.kcal; const msgs: string[] = [];
    if (Math.abs(dk) > Tg.kcal * 0.05) msgs.push(`${dk > 0 ? '+' : '−'}${fmt(Math.abs(dk))} kcal ${dk > 0 ? 'over' : 'under'} target`);
    if (t.p < Tg.p - 0.5) msgs.push(`${Math.round(Tg.p - t.p)} g protein short`);
    return {t, T: Tg, dk, ok: !msgs.length, msg: msgs.length ? `Closest today's menu allows: ${msgs.join(', ')}.` : ''};
  }

  function slack(): { k: number; p: number; flex: boolean } {
    const pl = plan(ctx.now.day); let k = 0, p = 0;
    for (const x of pl) {
      if (isUp(x) || isFlex(x) || !mealDone(x)) continue;
      const e = sumParts(eatenParts(x)); k += x.tot.k - e.k; p += x.tot.p - e.p;
    }
    return {k, p, flex: pl.some(isFlex)};
  }

  function completion(): { pct: number; e: MacroSum; T: PlannerTargets } {
    const Tg = T(); const e = dayTotals(ctx.now.day, true); const r = (a: number, b: number) => Math.min(1, a / b);
    const pct = (r(e.k, Tg.kcal)*.35 + r(e.p, Tg.p)*.35 + r(e.c, Tg.c)*.15 + r(e.f, Tg.f)*.15) * 100;
    return {pct: Math.round(pct), e, T: Tg};
  }

  const rangeK = (Tg: PlannerTargets = T()) => rangeKOf(ctx.p.goal, Tg);

  function todayHit(): boolean {
    const {e, T: Tg} = completion(); const [lo, hi] = rangeK(Tg); const sl = slack();
    return e.p >= Tg.p*0.9 - sl.p && e.k >= lo - sl.k && (e.k <= hi || sl.flex);
  }

  function overInfo() {
    const {e, T: Tg} = completion(); const [lo, hi] = rangeK(Tg); const sl = slack();
    return {over: Math.round(e.k - Tg.kcal), lo, hi, overRange: e.k > hi && !sl.flex, e, T: Tg};
  }

  function nextMeal(): MealPlan | null {
    return plan(ctx.now.day).find(x => x.parts.length && !mealDone(x) && x.m.end > ctx.now.mins) || null;
  }

  return {
    targets: T,
    rank,
    mealsOfDay,
    shareOf,
    plan,
    baseline,
    rebalance,
    planStatus,
    dayProjection,
    dayTotals,
    completion,
    slack,
    nextMeal,
    todayHit,
    overInfo,
    rangeK,
    isUp,
    isFlex,
    mealDone,
    mealStarted,
    skipped,
    eatenParts,
    menuFor: (mealId: string) => menuForData(menus, mealId),
    itemsFor,
    findItem,
    stationsOf: (name: string, mealId: string) => stationsOfData(menus, name, mealId),
  };
}

export type PlanEngine = ReturnType<typeof createEngine>;
