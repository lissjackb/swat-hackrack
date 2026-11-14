"use client";
// Hackro app state. Holds the onboarding form, the created profile id, and the
// day's targets/progress/whoop pulled from the real APIs. Persists the profile
// to localStorage so a refresh keeps you signed in.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Goal, ProfileInput, Sex, Targets, WhoopSnapshot } from "@/lib/types";
import {
  api,
  DEMO_DATE,
  DEMO_PROFILE_ID,
  daysToActivity,
  ftInToCm,
  lbToKg,
} from "./api";

/** Raw onboarding inputs (imperial + training days), before mapping to ProfileInput. */
export interface OnboardingForm {
  name: string;
  sex: Sex | null;
  age: string;
  ft: string;
  inch: string;
  lb: string;
  days: number | null;
  goal: Goal | null;
  restrictions: string[];
}

export const emptyForm: OnboardingForm = {
  name: "",
  sex: null,
  age: "",
  ft: "",
  inch: "",
  lb: "",
  days: null,
  goal: null,
  restrictions: [],
};

export function formToProfileInput(f: OnboardingForm): ProfileInput {
  return {
    name: f.name.trim() || "Student",
    goal: (f.goal ?? "maintain") as Goal,
    heightCm: ftInToCm(+f.ft || 0, +f.inch || 0),
    weightKg: lbToKg(+f.lb || 0),
    age: +f.age || 20,
    sex: (f.sex ?? "male") as Sex,
    activityLevel: daysToActivity(f.days ?? 3),
    restrictions: f.restrictions,
  };
}

type Tab = "today" | "dining" | "you";

interface DayProgress {
  eaten: { calories: number; protein: number; carbs: number; fat: number };
  target: { calories: number; protein: number; carbs: number; fat: number };
}

interface State {
  ready: boolean;
  view: "onboarding" | "app";
  tab: Tab;
  profileId: string | null;
  form: OnboardingForm;
  targets: Targets | null;
  progress: DayProgress | null;
  whoop: (WhoopSnapshot & { note?: string }) | null;
  loading: boolean;
  error: string | null;
}

interface Store extends State {
  setTab: (t: Tab) => void;
  completeOnboarding: (form: OnboardingForm) => Promise<void>;
  refreshDay: () => Promise<void>;
  signOut: () => void;
  date: string;
}

const Ctx = createContext<Store | null>(null);
const LS_KEY = "hackro-react-v1";

export function HackroProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>({
    ready: false,
    view: "onboarding",
    tab: "today",
    profileId: null,
    form: emptyForm,
    targets: null,
    progress: null,
    whoop: null,
    loading: false,
    error: null,
  });
  const patch = (p: Partial<State>) => setS((prev) => ({ ...prev, ...p }));
  // Avoid overlapping day-loads clobbering each other.
  const loadToken = useRef(0);

  async function loadDay(profileId: string, form: OnboardingForm) {
    const token = ++loadToken.current;
    patch({ loading: true, error: null });
    try {
      const input = formToProfileInput(form);
      // Whoop is best-effort (mock by default); feed it into targets so the
      // day's numbers match what progress computes server-side.
      let whoop: (WhoopSnapshot & { note?: string }) | null = null;
      try {
        whoop = await api.getWhoop(profileId, { date: DEMO_DATE });
      } catch {
        whoop = null;
      }
      const [targets, progress] = await Promise.all([
        api.getTargets(input, whoop ?? undefined),
        api
          .getProgress(profileId, DEMO_DATE)
          .then((p) => p.daily)
          .catch(() => null),
      ]);
      if (token !== loadToken.current) return; // superseded
      patch({ targets, progress, whoop, loading: false });
    } catch (e) {
      if (token !== loadToken.current) return;
      patch({ loading: false, error: (e as Error).message });
    }
  }

  // Restore a persisted profile on first mount.
  useEffect(() => {
    let saved: { profileId?: string; form?: OnboardingForm } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    } catch {
      saved = null;
    }
    if (saved?.profileId && saved.form) {
      setS((prev) => ({
        ...prev,
        ready: true,
        view: "app",
        profileId: saved!.profileId!,
        form: saved!.form!,
      }));
      void loadDay(saved.profileId, saved.form);
    } else {
      patch({ ready: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store: Store = {
    ...s,
    date: DEMO_DATE,
    setTab: (t) => patch({ tab: t }),
    async completeOnboarding(form) {
      patch({ loading: true, error: null });
      try {
        const input = formToProfileInput(form);
        let profileId = DEMO_PROFILE_ID;
        try {
          const profile = await api.createProfile(input);
          profileId = profile.id;
        } catch (e) {
          // If create fails, fall back to the seeded demo user so the demo still works.
          console.warn("[Hackro] profile create failed, using demo-profile:", (e as Error).message);
        }
        localStorage.setItem(LS_KEY, JSON.stringify({ profileId, form }));
        patch({ profileId, form, view: "app", tab: "today" });
        await loadDay(profileId, form);
      } catch (e) {
        patch({ loading: false, error: (e as Error).message });
      }
    },
    async refreshDay() {
      if (s.profileId) await loadDay(s.profileId, s.form);
    },
    signOut() {
      localStorage.removeItem(LS_KEY);
      setS((prev) => ({
        ...prev,
        view: "onboarding",
        profileId: null,
        form: emptyForm,
        targets: null,
        progress: null,
        whoop: null,
      }));
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useHackro(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHackro must be used within HackroProvider");
  return ctx;
}
