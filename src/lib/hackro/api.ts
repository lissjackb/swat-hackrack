"use client";
// Real-API bridge, ported from the mockup (lines 1675–1801). Same-origin
// calls to the /api routes backed by SQLite. Everything degrades to the
// built-in demo menu if the API is unreachable, so the app never hard-fails.
// One seeded test user: demo-profile.
import { API_MAP } from "@/lib/planner";
import type { HackroProfile, WearState } from "./state";

export const DEMO_PROFILE_ID = "demo-profile";
/** Active demo day (Sat Nov 14, 2026) — matches the seeded menu + MEALS. */
export const DEMO_DATE = "2026-11-14";

export interface MenuRow {
  id: string;
  date: string;
  meal: string;
  station: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary: string[];
  allergens: string[];
}

async function jget<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json() as Promise<T>;
}

/** Load the demo slots' menu rows (mockup bootstrapRealData). Returns the
 * rows and how many were usable; [] keeps the built-in menu per slot. */
export async function fetchMenuRows(): Promise<MenuRow[]> {
  const results = await Promise.all(
    Object.values(API_MAP).map((q) =>
      jget<{ items: MenuRow[] }>(`/api/menu?date=${q.date}&meal=${q.meal}`).then((d) => d.items || []),
    ),
  );
  const rows = results.flat();
  if (rows.length) console.log(`[Hackro] Loaded ${rows.length} real menu items from /api/menu (demo-profile)`);
  return rows;
}

/** Persist onboarding answers as a real Profile row (mockup createProfile). */
export async function createProfile(p: HackroProfile): Promise<string | null> {
  try {
    const heightCm = Math.round(((+p.ft! || 0) * 12 + (+p.inch! || 0)) * 2.54);
    const weightKg = +((+p.lb! || 0) * 0.4536).toFixed(1);
    const days = +(p.days ?? 0) || 0;
    const activityLevel = days <= 1 ? "light" : days <= 3 ? "moderate" : days <= 5 ? "active" : "veryActive";
    // CHANGE (PLANNER_SPEC): halal rides in restrictions.
    const restrictions = p.halal && !(p.restrictions || []).includes("halal")
      ? [...(p.restrictions || []), "halal"]
      : p.restrictions || [];
    const input = {
      name: p.name || "Student", goal: p.goal, heightCm, weightKg,
      age: +p.age! || 20, sex: p.sex, activityLevel, restrictions,
    };
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const prof = (await res.json()) as { id: string };
      console.log("[Hackro] profile created in DB:", prof.id);
      return prof.id;
    }
    console.warn("[Hackro] /api/profile rejected:", res.status, await res.text());
  } catch (e) {
    console.warn("[Hackro] profile create failed (keeping test user):", (e as Error).message);
  }
  return null;
}

/** One Whoop pull (PLANNER_SPEC: once after the profile loads; once with
 * mock=false after an OAuth return — never on render/tab/focus). */
export async function fetchWhoop(profileId: string, mock: boolean): Promise<WearState | null> {
  try {
    const w = await jget<{ recovery?: number; strain?: number; mock?: boolean; source?: string }>(
      `/api/whoop?profileId=${encodeURIComponent(profileId)}&date=${DEMO_DATE}${mock ? "" : "&mock=false"}`,
    );
    if (typeof w.recovery === "number" && typeof w.strain === "number") {
      return {
        recovery: Math.round(w.recovery),
        strain: Math.round(w.strain * 10) / 10,
        mock: w.mock !== false,
        source: w.source,
      };
    }
  } catch (e) {
    console.warn("[Hackro] whoop fetch failed:", (e as Error).message);
  }
  return null;
}

/** Persist an "I ate this" to the DB. Non-blocking: the UI already updated. */
export function postLog(
  rows: MenuRow[] | null,
  profileId: string,
  mealId: string | null,
  entry: { name: string; k?: number; p?: number; c?: number; f?: number },
): void {
  try {
    const q = (mealId && API_MAP[mealId]) || API_MAP["sat-l"];
    const menuItemId = mealId && rows
      ? rows.find((r) => r.date === q.date && r.meal === q.meal && r.name === entry.name)?.id ?? null
      : null;
    const body = menuItemId
      ? { profileId, date: q.date, meal: q.meal, servings: 1, menuItemId }
      : { profileId, date: q.date, meal: q.meal, servings: 1, name: entry.name, calories: entry.k || 0, protein: entry.p || 0, carbs: entry.c || 0, fat: entry.f || 0 };
    fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (r.ok) console.log("[Hackro] logged to DB:", entry.name);
      else console.warn("[Hackro] /api/log rejected:", r.status);
    }).catch(() => {});
  } catch {
    /* offline: local log already stands */
  }
}

/** Real WHOOP OAuth consent for the current profile; WHOOP returns the user
 * to /?whoop=connected (handled in the store's mount effect). */
export function connectWhoopLive(profileId: string): void {
  window.location.href = `/api/whoop/connect?profileId=${encodeURIComponent(profileId)}`;
}
