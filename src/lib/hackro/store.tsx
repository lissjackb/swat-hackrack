"use client";
// The Hackro store: the mockup's global `S` + the `A` action handlers
// (lines 384–393, 1546–1674), ported to a React context. Rules:
//  - State is immutable per action: each handler works on a structuredClone
//    draft, then commits it (the React Compiler is on — no in-place mutation
//    of committed state).
//  - The engine is the SHARED planner (src/lib/planner) — the same module the
//    API routes run, so server numbers always equal what's on screen.
//  - Persisted to localStorage key "hackro-react-v1" (NEVER hackro-demo-v9,
//    the mockup's key — PORT_PLAN).
import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import {
  createPlanner, mealById, qty, DIET_VALUES, ALLERGEN_KEYS,
  allergenState, userHits, guessAllergens,
  type Planner, type PlanContext, type PlannerProfile,
} from "@/lib/planner";
import { DEFAULT, ALLPERMS, type HackroState, type HackroProfile, type SheetState } from "./state";
import { QUICK } from "./data";
import {
  DEMO_PROFILE_ID, connectWhoopLive, createProfile as apiCreateProfile,
  fetchMenuRows, fetchWhoop, postLog, type MenuRow,
} from "./api";
import { goalPlan, fmtDate, neverLabel, withOtherRestriction } from "./helpers";

const KEY = "hackro-react-v1";
const OB_STEPS = 4;

export function profileOf(state: HackroState): PlannerProfile {
  const p = state.p;
  return {
    name: p.name,
    goal: p.goal ?? "maintain",
    sex: p.sex ?? "male",
    age: Number(p.age) || 0,
    ft: Number(p.ft) || 0,
    inch: Number(p.inch) || 0,
    lb: Number(p.lb) || 0,
    days: p.days,
    restrictions: p.restrictions,
    halal: p.halal,
    snack: p.snack,
    fifth: p.fifth,
    never: p.never,
  };
}

function ctxOf(state: HackroState): Partial<PlanContext> & { p: PlannerProfile } {
  return {
    p: profileOf(state),
    device: state.device,
    perms: state.perms,
    whoop: state.wear,
    seed: state.seed,
    swaps: state.swaps,
    itemSwaps: state.itemSwaps,
    adds: state.adds,
    ate: state.ate,
    done: state.done,
    locked: state.locked,
    flex: state.flex,
    extras: state.extras,
  };
}

export interface Toast { msg: string; key: number }

export interface Hackro {
  S: HackroState;
  /** The planner engine for the CURRENT state (shared module, see header). */
  E: Planner;
  rows: MenuRow[] | null;
  ready: boolean;
  toast: Toast | null;
  currentProfileId: () => string;
  A: ReturnType<typeof buildActions>;
}

const Ctx = createContext<Hackro | null>(null);

export function useHackro(): Hackro {
  const h = useContext(Ctx);
  if (!h) throw new Error("useHackro outside HackroProvider");
  return h;
}

/* ------------------------------------------------------------------ */

function buildActions(io: {
  get: () => HackroState;
  commit: (next: HackroState) => void;
  engineFor: (state: HackroState) => Planner;
  rows: () => MenuRow[] | null;
  showToast: (msg: string) => void;
  profileId: () => string;
}) {
  const { get, commit, engineFor, rows, showToast, profileId } = io;
  const clone = () => structuredClone(get());
  const sg = (v: number) => (v >= 0 ? "+" : "−") + Math.round(Math.abs(v)).toLocaleString("en-US");

  /** Editing target: onboarding edits p; in-app (vGoals) edits the draft. */
  const tgtOf = (d: HackroState) => (d.view === "app" ? (d.draft ??= structuredClone(d.p)) : d.p);

  /** The mockup's logEat (1546–1559): snapshot the day, apply the change,
   * lock started meals at their current plates, then compare before/after
   * for streak toasts and the reward sheet. */
  function logEat(d: HackroState, fn: () => void, msg?: string) {
    const Epre = engineFor(d);
    const snap = Epre.plan("sat");
    const before = Epre.todayHit();
    fn();
    for (const x of snap) {
      const id = x.m.id;
      const active = (d.ate[id] || []).length || d.done[id];
      if (active && !d.locked[id]) {
        d.locked[id] = {
          parts: x.parts.map((pp) => ({ name: pp.it.name, m: pp.m, orig: pp.orig || 0, added: !!pp.added, from: pp.from || undefined })),
          removed: x.removed || [],
        };
      }
      if (!active) delete d.locked[id];
    }
    const Epost = engineFor(d);
    const now = Epost.plan("sat");
    const after = Epost.todayHit();
    const O = Epost.overInfo();
    const ch = now
      .filter((x) => Epost.isUp(x))
      .map((x) => {
        const b = snap.find((y) => y.m.id === x.m.id);
        return b && Epre.isUp(b) ? { n: x.m.name, dk: x.tot.k - b.tot.k, dp: x.tot.p - b.tot.p } : null;
      })
      .filter((c): c is { n: string; dk: number; dp: number } => !!c && Math.abs(c.dk) >= 20)
      .sort((a, b) => Math.abs(b.dk) - Math.abs(a.dk));
    const adj = ch.length
      ? `${ch[0].n} adjusted: ${sg(ch[0].dk)} kcal, ${sg(Math.round(ch[0].dp))} g protein${ch.length > 1 ? ` (+${ch.length - 1} more)` : ""}`
      : "";
    if (!before && after) { d.sheet = { type: "reward" }; return; }
    if (before && !after) {
      showToast(O.overRange ? "Over your range. No streak freeze yet, so today won't count" : "Below target again. Streak paused");
      return;
    }
    const t = [msg, adj].filter(Boolean).join(". ");
    if (t) showToast(t);
  }

  function runGen() {
    const d = clone();
    d.view = "gen"; d.gen = 0;
    commit(d);
    apiCreateProfile(get().p).then((id) => {
      if (id) { const n = clone(); n.profileId = id; commit(n); }
    });
    const tick = () => {
      const n = clone();
      n.gen++;
      if (n.gen >= 4) { n.view = "reveal"; commit(n); return; }
      commit(n);
      setTimeout(tick, 650);
    };
    setTimeout(tick, 650);
  }

  function enterApp(d?: HackroState) {
    const n = d ?? clone();
    n.view = "app"; n.tab = "today"; n.stack = []; n.sheet = null;
    commit(n);
  }

  /** needConfirm (mockup 1072–1075). True = a confirm screen was shown. */
  function needConfirm(d: HackroState, a: string, v: string, hits: string[]): boolean {
    if (!hits.length || (d.sheet && d.sheet.ok)) return false;
    if (d.sheet) d.sheet.confirm = { a, v, hits };
    commit(d);
    return true;
  }

  const A = {
    login() { const d = clone(); d.view = "ob"; d.step = 0; commit(d); },
    set(k: string, v: string | number) { const d = clone(); (tgtOf(d) as unknown as Record<string, unknown>)[k] = v; commit(d); },
    toggle(k: string) { const d = clone(); const t = tgtOf(d) as unknown as Record<string, unknown>; t[k] = !t[k]; commit(d); },
    setDiet(v: string) {
      const d = clone(); const t = tgtOf(d);
      t.restrictions = (t.restrictions || []).filter((r) => !DIET_VALUES.has(r));
      if (v !== "omnivore") t.restrictions.push(v);
      t.dietPicked = true; commit(d);
    },
    allergy(v: string) {
      const d = clone(); const t = tgtOf(d);
      t.restrictions = t.restrictions || [];
      t.restrictions = t.restrictions.includes(v) ? t.restrictions.filter((x) => x !== v) : [...t.restrictions, v];
      t.allergySet = true; commit(d);
    },
    noAllergy() {
      const d = clone(); const t = tgtOf(d);
      t.restrictions = (t.restrictions || []).filter((r) => DIET_VALUES.has(r));
      t.otherOn = false; t.allergySet = true; commit(d);
    },
    otherAllergy() {
      const d = clone(); const t = tgtOf(d);
      t.otherOn = !t.otherOn; t.allergySet = true;
      if (!t.otherOn) t.restrictions = withOtherRestriction(t.restrictions, "", DIET_VALUES, ALLERGEN_KEYS);
      commit(d);
    },
    otherInput(text: string) {
      const d = clone(); const t = tgtOf(d);
      t.restrictions = withOtherRestriction(t.restrictions, text, DIET_VALUES, ALLERGEN_KEYS);
      commit(d);
    },
    field(k: string, v: string, num?: boolean) {
      const d = clone();
      (tgtOf(d) as unknown as Record<string, unknown>)[k] = num ? (v === "" ? "" : +v) : v;
      commit(d);
    },
    step(k: string, delta: number, min: number, max: number) {
      const d = clone(); const t = tgtOf(d) as unknown as Record<string, number>;
      t[k] = Math.max(min, Math.min(max, (+t[k] || 0) + delta));
      commit(d);
    },
    sport(v: string) {
      const d = clone(); const t = tgtOf(d);
      const cur = Array.isArray(t.sport) ? t.sport : t.sport ? [t.sport] : [];
      t.sport = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      commit(d);
    },
    obBack() { const d = clone(); d.obTried = false; d.step = Math.max(0, d.step - 1); commit(d); },
    obNext(valid: boolean) {
      const d = clone();
      if (!valid) { d.obTried = true; commit(d); return; }
      d.obTried = false;
      if (d.step < OB_STEPS - 1) { d.step++; commit(d); } else { commit(d); runGen(); }
    },
    go(v: HackroState["view"]) { const d = clone(); d.view = v; commit(d); },
    enter() { enterApp(); },
    whoopYes() { const d = clone(); d.whoop = "yes"; d.view = "connect"; commit(d); },
    whoopNo() { const d = clone(); d.whoop = "no"; enterApp(d); },
    auth(id: string) {
      const d = clone();
      d.whoop = "yes";
      d.sheet = { type: "auth", id, perms: d.device ? { ...d.perms } : ALLPERMS() };
      commit(d);
    },
    perm(k: string) {
      const d = clone();
      if (d.sheet) d.sheet.perms = { ...(d.sheet.perms || {}), [k]: !d.sheet.perms?.[k] };
      commit(d);
    },
    disconnect() { const d = clone(); d.device = null; d.sheet = null; commit(d); showToast("Whoop disconnected"); },
    closeSheet() { const d = clone(); d.sheet = null; commit(d); },
    allow(id: string) {
      const d = clone(); const pm = d.sheet?.perms || ALLPERMS();
      if (d.device === id) {
        d.perms = pm; d.sheet = null; commit(d);
        const n = Object.values(pm).filter(Boolean).length;
        showToast(`Whoop now shares ${n} of ${Object.keys(pm).length} data types`);
        return;
      }
      // Real connect: remember the chosen perms, then send the user through
      // WHOOP OAuth. Persist synchronously — we're about to navigate away.
      d.perms = pm; d.sheet = null; commit(d);
      try { localStorage.setItem(KEY, JSON.stringify({ ...d, sheet: null })); } catch {}
      connectWhoopLive(profileId());
    },
    tab(v: HackroState["tab"]) { const d = clone(); d.tab = v; d.stack = []; commit(d); },
    open(v: string) {
      const d = clone();
      if (v === "goals") d.draft = structuredClone(d.p);
      if (v.startsWith("swap:")) d.swapSel = null;
      d.stack.push(v); commit(d);
    },
    back() { const d = clone(); d.stack.pop(); commit(d); },
    finish(id: string) {
      const d = clone(); const E = engineFor(d);
      const x = E.plan("sat").find((y) => y.m.id === id)!;
      const n = E.skipped(x);
      logEat(d, () => { d.done[id] = true; }, `${x.m.name} logged · skipped ${n}`);
      if (d.stack.length) d.stack.pop();
      commit(d);
    },
    iswap(meal: string, key: string) { const d = clone(); d.sheet = { type: "iswap", meal, key }; commit(d); },
    iswapGo(meal: string, key: string, name: string, m: number) {
      const d = clone(); const E = engineFor(d);
      const x = E.plan(mealById(meal)!.day).find((y) => y.m.id === meal)!;
      const cur = x.parts.find((q) => (q.from || q.it.name) === key)!;
      d.sheet = null;
      logEat(d, () => {
        d.itemSwaps[meal] = { ...(d.itemSwaps[meal] || {}), [key]: { name, m: +m } };
        d.ate[meal] = (d.ate[meal] || []).filter((n) => n !== cur.it.name);
      }, `${name} swapped in`);
      commit(d);
    },
    iswapReset(meal: string, key: string) {
      const d = clone();
      const sw = { ...(d.itemSwaps[meal] || {}) };
      delete sw[key];
      d.itemSwaps[meal] = sw; d.sheet = null; commit(d);
      showToast(`Back to ${key}`);
    },
    never(name: string, mid: string) {
      const d = clone(); const E = engineFor(d);
      const short = neverLabel(E, name);
      const day = mealById(mid)!.day;
      const before = E.plan(day).find((y) => y.m.id === mid);
      const had = !!before && before.parts.some((pp) => pp.it.name === name);
      d.sheet = null;
      logEat(d, () => {
        d.p.never = [...new Set([...(d.p.never || []), name])];
        for (const id in d.adds || {}) d.adds[id] = d.adds[id].filter((a) => a.name !== name);
        for (const id in d.locked) {
          const L = d.locked[id]; const ate = new Set(d.ate[id] || []);
          if (L.parts && !d.done[id]) L.parts = L.parts.filter((q) => q.name !== name || ate.has(name));
        }
      }, "");
      const after = had ? engineFor(d).plan(day).find((y) => y.m.id === mid) : null;
      const rep = after ? after.parts.find((pp) => !before!.parts.some((q) => q.it.name === pp.it.name)) : null;
      if (!d.sheet) showToast(`${short} won't be suggested again${rep ? ` · ${neverLabel(engineFor(d), rep.it.name)} instead` : ""}`);
      if (d.stack.length && d.stack[d.stack.length - 1].startsWith("food:")) d.stack.pop();
      commit(d);
    },
    unnever(name: string) {
      const d = clone();
      d.p.never = (d.p.never || []).filter((n) => n !== name);
      commit(d);
      showToast(`${neverLabel(engineFor(d), name)} is back in your plans`);
    },
    openLog() { const d = clone(); d.sheet = { type: "log", tab: "quick", q: "", c: {} }; commit(d); },
    logTab(v: "quick" | "menu" | "custom") { const d = clone(); if (d.sheet) d.sheet.tab = v; commit(d); },
    logConfirm() {
      const d = clone(); const cf = d.sheet?.confirm;
      if (!d.sheet || !cf) return;
      d.sheet.confirm = null; d.sheet.ok = true;
      commit(d);
      if (cf.a === "logQuick") A.logQuick(+cf.v);
      else if (cf.a === "logMenu") { const [n, mid] = cf.v.split("|"); A.logMenu(n, mid); }
      else if (cf.a === "logCustom") A.logCustom();
    },
    logCancel() { const d = clone(); if (d.sheet) d.sheet.confirm = null; commit(d); },
    logQuick(i: number) {
      const d = clone();
      const [name, k, p, c, f] = QUICK[i];
      const hits = userHits(guessAllergens(name), name, profileOf(d));
      if (needConfirm(d, "logQuick", String(i), hits)) return;
      d.sheet = null;
      logEat(d, () => { d.extras.push({ name, k, p, c, f, src: "Quick add", hits }); }, `${name} logged`);
      postLog(rows(), profileId(), null, { name, k, p, c, f });
      commit(d);
    },
    logMenu(name: string, mid: string) {
      const d = clone(); const E = engineFor(d);
      const it = E.findItem(name, mid); if (!it || !it.nut) return;
      const n = it.nut;
      const hits = userHits(allergenState(it).list, name, profileOf(d));
      if (needConfirm(d, "logMenu", `${name}|${mid}`, hits)) return;
      d.sheet = null;
      logEat(d, () => { d.extras.push({ name: `${name}, ${qty(n[4], n[5])}`, k: n[0], p: n[1], c: n[2], f: n[3], src: "Dining Center", hits }); }, `${name} logged`);
      postLog(rows(), profileId(), mid, { name, k: n[0], p: n[1], c: n[2], f: n[3] });
      commit(d);
    },
    cGram(delta: number) {
      const d = clone(); const c = d.sheet?.c; if (!c) return;
      c.grams = Math.max(25, (+(c.grams ?? 100) || 100) + delta);
      c.manual = false;
      if (c.per100) {
        const g = (+c.grams || 100) / 100;
        c.k = Math.round(c.per100.k * g); c.p = Math.round(c.per100.p * g);
        c.c = Math.round(c.per100.c * g); c.f = Math.round(c.per100.f * g);
      }
      commit(d);
    },
    setCustom(patch: Partial<NonNullable<SheetState["c"]>>) {
      const d = clone(); if (!d.sheet) return;
      d.sheet.c = { ...(d.sheet.c || {}), ...patch };
      commit(d);
    },
    logCustom() {
      const d = clone(); const c = d.sheet?.c || {};
      if (!c.name || !+(c.k ?? 0)) { showToast("Add a name and calories"); return; }
      const hits = userHits(guessAllergens(c.name), c.name, profileOf(d));
      if (needConfirm(d, "logCustom", "", hits)) return;
      d.sheet = null;
      const entry = { name: c.name, k: +(c.k ?? 0) || 0, p: +(c.p ?? 0) || 0, c: +(c.c ?? 0) || 0, f: +(c.f ?? 0) || 0 };
      logEat(d, () => { d.extras.push({ ...entry, src: "Custom", hits }); }, `${c.name} logged`);
      postLog(rows(), profileId(), null, entry);
      commit(d);
    },
    rmExtra(i: number) {
      const d = clone();
      logEat(d, () => { d.extras.splice(i, 1); }, "Removed");
      commit(d);
    },
    seeRewards() { const d = clone(); d.sheet = null; d.tab = "goals"; d.stack = []; commit(d); },
    eat(id: string) {
      const d = clone(); const E = engineFor(d);
      logEat(d, () => {
        const x = E.plan(mealById(id)!.day).find((y) => y.m.id === id)!;
        d.ate[id] = x.parts.map((pp) => pp.it.name);
        d.done[id] = true;
      }, `${mealById(id)!.name} logged`);
      if (d.stack.length) d.stack.pop();
      commit(d);
    },
    eatMeal(id: string) {
      const d = clone(); const E = engineFor(d);
      const x = E.plan("sat").find((y) => y.m.id === id)!;
      const done = E.mealDone(x), started = E.mealStarted(x);
      logEat(d, () => {
        if (done) { d.ate[id] = []; d.done[id] = false; }
        else if (started) { d.done[id] = true; }
        else { d.ate[id] = x.parts.map((pp) => pp.it.name); d.done[id] = true; }
      }, done ? `${x.m.name} unmarked` : started ? `${x.m.name} logged · skipped ${E.skipped(x)}` : `${x.m.name} logged`);
      commit(d);
    },
    eatItem(id: string, name: string) {
      const d = clone();
      const cur = new Set(d.ate[id] || []);
      logEat(d, () => {
        if (cur.has(name)) cur.delete(name); else cur.add(name);
        d.ate[id] = [...cur];
        if (!cur.size) d.done[id] = false;
      });
      commit(d);
    },
    swapSel(v: string) { const d = clone(); d.swapSel = v; commit(d); },
    swapGo(id: string) {
      const d = clone(); const sel = d.swapSel;
      d.swapSel = null; d.stack.pop();
      logEat(d, () => {
        if (sel) d.swaps[id] = sel;
        d.ate[id] = []; d.done[id] = false;
        delete d.locked[id]; delete d.itemSwaps[id];
      }, "Swapped");
      commit(d);
    },
    flex(id: string) { const d = clone(); d.sheet = { type: "flex", meal: id, f: {} }; commit(d); },
    flexSave() {
      const d = clone(); const id = d.sheet?.meal; if (!id) return;
      const f = d.sheet?.f || {};
      const E = engineFor(d);
      const x = E.plan("sat").find((y) => y.m.id === id)!;
      const k = +(f.k ?? 0) > 0 ? +f.k! : x.tot.k;
      const p = f.p !== undefined && f.p !== "" ? +f.p : (+(f.k ?? 0) > 0 ? Math.round(k * 0.2 / 4) : x.tot.p);
      const rest = Math.max(0, k - p * 4);
      const est = !(+(f.k ?? 0) > 0);
      d.sheet = null;
      if (d.stack.length) d.stack.pop();
      logEat(d, () => {
        d.flex[id] = est
          ? { k: x.tot.k, p: x.tot.p, c: x.tot.c, f: x.tot.f, est: true }
          : { k, p, c: rest * 0.55 / 4, f: rest * 0.45 / 9, est: false };
        d.ate[id] = []; d.done[id] = false;
      }, `${x.m.name} is flex`);
      commit(d);
    },
    flexSkip() {
      const d = clone(); if (d.sheet) d.sheet.f = {};
      commit(d);
      A.flexSave();
    },
    setFlexField(k: "k" | "p", v: string) {
      const d = clone(); if (!d.sheet) return;
      d.sheet.f = { ...(d.sheet.f || {}), [k]: v };
      commit(d);
    },
    setSheetQ(q: string) { const d = clone(); if (d.sheet) d.sheet.q = q; commit(d); },
    unflex(id: string) {
      const d = clone();
      logEat(d, () => { delete d.flex[id]; }, "Flex removed");
      commit(d);
    },
    planDay(v: "sat" | "sun") { const d = clone(); d.planDay = v; commit(d); },
    regen(day: string) {
      const d = clone(); const E = engineFor(d);
      const go = () => {
        for (const m of E.mealsOfDay(day)) {
          if ((d.ate[m.id] || []).length || d.done[m.id] || d.flex[m.id]) continue;
          d.seed[m.id] = (d.seed[m.id] || 0) + 1;
          delete d.swaps[m.id]; delete d.itemSwaps[m.id];
        }
      };
      if (day === "sat") logEat(d, go, `New ${day === "sat" ? "Saturday" : "Sunday"} plan built around what you've eaten`);
      else { go(); showToast("New Sunday plan, same targets"); }
      commit(d);
    },
    dineMeal(v: string) { const d = clone(); d.dineMeal = v; commit(d); },
    dineFilter(v: string) { const d = clone(); d.dineFilter = d.dineFilter === v ? null : v; commit(d); },
    dineFits() { const d = clone(); d.dineFits = d.dineFits === false; commit(d); },
    addToPlan(name: string, mid: string) {
      const d = clone();
      d.adds = d.adds || {};
      logEat(d, () => { d.adds[mid] = [...(d.adds[mid] || []), { name, m: 1 }]; }, `${name.replace(/ FZ$/, "")} added to ${mealById(mid)!.name.toLowerCase()}`);
      d.stack.pop();
      commit(d);
    },
    logThis(name: string, mid: string) {
      const d = clone(); const E = engineFor(d);
      const it = E.findItem(name, mid); if (!it) return;
      const hits = userHits(allergenState(it).list, name, profileOf(d));
      d.sheet = { type: "log", tab: "menu", q: "", c: {} };
      if (needConfirm(d, "logMenu", `${name}|${mid}`, hits)) return;
      commit(d);
      A.logMenu(name, mid);
    },
    bgField(k: "target" | "date", v: string) {
      const d = clone();
      const top = d.stack[d.stack.length - 1];
      if (top === "goals") {
        if (d.draft) d.draft.bodyGoal = { ...(d.draft.bodyGoal || { target: "", date: "" }), [k]: v };
      } else {
        d.bgDraft = { ...(d.bgDraft || { target: "", date: "" }), [k]: v };
      }
      commit(d);
    },
    initBgDraft(date: string) {
      const d = clone();
      if (!d.bgDraft) { d.bgDraft = { target: "", date }; commit(d); }
    },
    saveBodyGoal() {
      const d = clone(); const g = d.bgDraft;
      const gp = goalPlan(g, d.p);
      if (!gp || gp.same) { showToast("Add a target weight and date"); return; }
      d.p.bodyGoal = { target: +g!.target, date: g!.date, edits: 0 };
      d.bgDraft = null; d.stack.pop();
      commit(d);
      showToast(gp.extended ? `Goal set. Ends ${fmtDate(gp.end!)} to keep the pace safe` : `Goal set for ${fmtDate(gp.end!)}`);
    },
    saveGoals() {
      const d = clone();
      if (!d.draft) return;
      if (d.draft.bodyGoal && d.p.bodyGoal && JSON.stringify(d.draft.bodyGoal) !== JSON.stringify(d.p.bodyGoal)) {
        d.draft.bodyGoal.edits = (d.p.bodyGoal.edits || 0) + 1;
      }
      d.p = { ...d.draft, bodyGoal: d.draft.bodyGoal ? { target: +d.draft.bodyGoal.target, date: d.draft.bodyGoal.date, edits: d.draft.bodyGoal.edits || 0 } : d.draft.bodyGoal ?? null } as HackroProfile;
      d.swaps = {}; d.itemSwaps = {}; d.ate = {}; d.done = {}; d.locked = {}; d.flex = {};
      d.stack.pop();
      commit(d);
      showToast("Plan rebuilt for your new goals");
    },
    reset() {
      const keepEmail = get().p.email;
      const d = DEFAULT();
      d.p.email = keepEmail;
      commit(d);
    },
    logout() { const d = clone(); d.view = "login"; commit(d); },
    /** Internal: merge a Whoop snapshot pulled from the API. */
    _wear(w: HackroState["wear"], connected: boolean) {
      const d = clone();
      d.wear = w;
      if (connected) {
        d.device = "whoop";
        if (!(d.perms && d.perms.recovery)) d.perms = ALLPERMS();
        if (["login", "ob", "gen", "connect", "reveal"].includes(d.view)) { d.view = "app"; d.tab = "today"; }
      }
      commit(d);
      if (connected && w) showToast(w.mock ? "Whoop connected · last synced data" : `Whoop live · recovery ${w.recovery}%, strain ${w.strain}`);
    },
  };
  return A;
}

/* ------------------------------------------------------------------ */

export function HackroProvider({ children }: { children: ReactNode }) {
  const [S, setS] = useState<HackroState>(DEFAULT);
  const [rows, setRows] = useState<MenuRow[] | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const stateRef = useRef(S);
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // Hydrate from localStorage once (client only — the mockup reads it
  // synchronously; React must wait for mount).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as HackroState;
        const merged: HackroState = { ...DEFAULT(), ...saved, sheet: null };
        if (merged.view === "gen") merged.view = "reveal";
        stateRef.current = merged;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration on mount
        setS(merged);
      }
    } catch { /* fresh start */ }
    setReady(true);
  }, []);

  // Persist (the mockup's save(), minus the sheet).
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({ ...S, sheet: null })); } catch { /* full/blocked */ }
  }, [S, ready]);

  // Bootstrap the real menu once (mockup bootstrapRealData).
  useEffect(() => {
    let on = true;
    fetchMenuRows().then((r) => { if (on) setRows(r); }).catch(() => { if (on) setRows([]); });
    return () => { on = false; };
  }, []);

  const currentProfileId = () => stateRef.current.profileId || DEMO_PROFILE_ID;

  const io = useMemo(() => ({
    get: () => stateRef.current,
    commit: (next: HackroState) => { stateRef.current = next; setS(next); },
    engineFor: (state: HackroState) => createPlanner(rowsRef.current ?? undefined, ctxOf(state)),
    rows: () => rowsRef.current,
    showToast: (msg: string) => setToast({ msg, key: Date.now() }),
    profileId: () => stateRef.current.profileId || DEMO_PROFILE_ID,
  }), []);

  // Actions read state/rows through refs at EVENT time only (never while
  // rendering); the refs rule can't see that, so it's disabled here.
  // eslint-disable-next-line react-hooks/refs
  const A = useMemo(() => buildActions(io), [io]);

  // One Whoop pull after hydration (PLANNER_SPEC: once; after an OAuth
  // return, once with mock=false). Never again on render/tab/focus.
  const whoopPulled = useRef(false);
  useEffect(() => {
    if (!ready || whoopPulled.current) return;
    whoopPulled.current = true;
    const url = new URL(window.location.href);
    const returned = url.searchParams.get("whoop") === "connected";
    if (returned) history.replaceState({}, "", "/"); // so a refresh doesn't re-trigger
    fetchWhoop(currentProfileId(), !returned).then((w) => {
      if (!w) return;
      if (returned) A._wear(w, true);
      else A._wear(w, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Clear the toast after 2.6 s (mockup toast()).
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const E = useMemo(() => createPlanner(rows ?? undefined, ctxOf(S)), [rows, S]);

  const value: Hackro = { S, E, rows, ready, toast, currentProfileId, A };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
