// Client-side wrappers for Hackro's real API routes. Every screen talks to the
// backend through this module so the fetch shapes live in one place.
import type {
  ActivityLevel,
  MacroTargets,
  MenuItemDTO,
  ProfileInput,
  Targets,
  WhoopSnapshot,
} from "@/lib/types";

/** The demo runs off one seeded test user until onboarding creates a real one. */
export const DEMO_PROFILE_ID = "demo-profile";
/** Active day for the demo — matches the seeded menu + logs (Sat Nov 14, 2026). */
export const DEMO_DATE = "2026-11-14";

export interface Profile extends ProfileInput {
  id: string;
  createdAt?: string;
}

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `${init?.method ?? "GET"} ${url} → ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

// ---- Unit mapping: onboarding collects imperial + training days; the backend
// ---- ProfileInput is metric + an activityLevel enum.
export const ftInToCm = (ft: number, inch: number) =>
  Math.round((ft * 12 + inch) * 2.54);
export const lbToKg = (lb: number) => Math.round(lb * 0.4536 * 10) / 10;
export const daysToActivity = (days: number): ActivityLevel =>
  days <= 1 ? "light" : days <= 3 ? "moderate" : days <= 5 ? "active" : "veryActive";

export const api = {
  createProfile: (input: ProfileInput) =>
    jfetch<Profile>("/api/profile", { method: "POST", body: JSON.stringify(input) }),

  getProfile: (id: string) => jfetch<Profile>(`/api/profile?id=${encodeURIComponent(id)}`),

  getTargets: (profile: ProfileInput, whoop?: WhoopSnapshot) =>
    jfetch<Targets>("/api/targets", {
      method: "POST",
      body: JSON.stringify({ profile, whoop }),
    }),

  getMenu: (date: string, meal?: string) =>
    jfetch<{ items: MenuItemDTO[] }>(
      `/api/menu?date=${date}${meal ? `&meal=${meal}` : ""}`,
    ).then((r) => r.items),

  logMenu: (profileId: string, date: string, meal: string, menuItemId: string, servings = 1) =>
    jfetch<unknown>("/api/log", {
      method: "POST",
      body: JSON.stringify({ profileId, date, meal, menuItemId, servings }),
    }),

  logCustom: (
    profileId: string,
    date: string,
    meal: string,
    entry: { name: string } & MacroTargets,
    servings = 1,
  ) =>
    jfetch<unknown>("/api/log", {
      method: "POST",
      body: JSON.stringify({ profileId, date, meal, servings, ...entry }),
    }),

  getProgress: (profileId: string, date: string, days = 7) =>
    jfetch<{
      daily: { eaten: MacroTargets; target: MacroTargets; pct: MacroTargets };
      week: { date: string; eaten: MacroTargets; target: MacroTargets; pct: MacroTargets }[];
    }>(`/api/progress?profileId=${encodeURIComponent(profileId)}&date=${date}&days=${days}`),

  getWhoop: (profileId: string, opts?: { date?: string; mock?: boolean }) =>
    jfetch<WhoopSnapshot & { note?: string }>(
      `/api/whoop?profileId=${encodeURIComponent(profileId)}${opts?.date ? `&date=${opts.date}` : ""}${opts?.mock === false ? "&mock=false" : ""}`,
    ),

  /** USDA FoodData Central lookup for custom-food macros (per 100g). */
  lookupNutrition: (name: string) =>
    jfetch<{ name: string; nutrition: (MacroTargets & { match: string; per: string }) | null }>(
      `/api/nutrition?name=${encodeURIComponent(name)}`,
    ),
};
