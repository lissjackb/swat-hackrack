// The React store's state shape — the mockup's `S` (DEFAULT(), line 384),
// field for field. PORT_PLAN Terminal A: this file is the contract between
// the store and every screen.
import type { Goal, Sex } from "@/lib/types";
import type { MacroSum, MealLock } from "@/lib/planner";

/** The mockup's S.p. Client units (lb/ft/inch/days); '' = untouched input. */
export interface HackroProfile {
  name: string;
  email: string;
  goal: Goal | null;
  sex: Sex | null;
  age: number | "";
  ft: number | "";
  inch: number | "";
  lb: number | "";
  days: number | null;
  sport: string[] | string | null;
  restrictions: string[];
  dietPicked: boolean;
  allergySet: boolean;
  otherOn: boolean;
  halal: boolean;
  plan: "swat" | "garnet" | "none";
  snack: boolean;
  fifth: boolean;
  never: string[];
  bodyGoal?: { target: number; date: string; edits: number } | null;
}

export interface CustomDraft {
  name?: string;
  grams?: number;
  k?: number | string;
  p?: number | string;
  c?: number | string;
  f?: number | string;
  per100?: { k: number; p: number; c: number; f: number } | null;
  match?: string;
  manual?: boolean;
  loading?: boolean;
  searched?: boolean;
  reqId?: number;
}

export interface SheetState {
  type: "auth" | "sync" | "synced" | "iswap" | "log" | "reward" | "flex";
  id?: string;
  meal?: string;
  key?: string;
  perms?: Record<string, boolean>;
  tab?: "quick" | "menu" | "custom";
  q?: string;
  c?: CustomDraft;
  f?: { k?: number | string; p?: number | string };
  confirm?: { a: string; v: string; hits: string[] } | null;
  ok?: boolean;
}

/** The Goals editor's working copy: bodyGoal fields may be mid-edit text. */
export type HackroDraft = Omit<HackroProfile, "bodyGoal"> & {
  bodyGoal?: { target: number | string; date: string; edits?: number } | null;
};

export interface Extra extends MacroSum {
  name: string;
  src?: string;
  hits?: string[];
}

/** Whoop snapshot held in the store (replaces the mockup's WEAR global —
 * PLANNER_SPEC "Client (store, React port)"). */
export interface WearState {
  recovery: number;
  strain: number;
  mock: boolean;
  source?: string;
}

export type View = "login" | "ob" | "gen" | "reveal" | "connect" | "app";
export type Tab = "today" | "plan" | "dining" | "goals" | "you";

export interface HackroState {
  view: View;
  step: number;
  gen: number;
  profileId: string | null;
  p: HackroProfile;
  device: string | null;
  /** The mockup's S.whoop: the yes/no choice on the reveal screen. */
  whoop: "yes" | "no" | null;
  /** Live/mock snapshot from GET /api/whoop (replaces WEAR). */
  wear: WearState | null;
  perms: Record<string, boolean>;
  seed: Record<string, number>;
  swaps: Record<string, string>;
  itemSwaps: Record<string, Record<string, { name: string; m: number }>>;
  adds: Record<string, { name: string; m: number }[]>;
  ate: Record<string, string[]>;
  done: Record<string, boolean>;
  locked: Record<string, MealLock>;
  flex: Record<string, MacroSum & { est?: boolean }>;
  extras: Extra[];
  tab: Tab;
  stack: string[];
  planDay: "sat" | "sun";
  dineMeal: string;
  dineFilter: string | null;
  dineFits: boolean;
  sheet: SheetState | null;
  // Runtime-only fields the mockup hangs off S:
  draft?: HackroDraft;
  bgDraft?: { target: number | string; date: string } | null;
  swapSel?: string | null;
  obTried?: boolean;
}

export const ALLPERMS = (): Record<string, boolean> => ({ recovery: true });

export const DEFAULT = (): HackroState => ({
  view: "login", step: 0, gen: 0, profileId: null,
  p: {
    name: "", email: "", goal: null, sex: null, age: "", ft: "", inch: "", lb: "",
    days: null, sport: null, restrictions: [], dietPicked: false, allergySet: false,
    otherOn: false, halal: false, plan: "swat", snack: true, fifth: true, never: [],
  },
  device: null, whoop: null, wear: null, perms: ALLPERMS(), seed: {}, swaps: {},
  itemSwaps: {}, adds: {}, ate: {}, done: {}, locked: {}, flex: {}, extras: [],
  tab: "today", stack: [], planDay: "sat", dineMeal: "sat-b", dineFilter: null,
  dineFits: true, sheet: null,
});
