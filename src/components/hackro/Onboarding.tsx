"use client";
import { useState } from "react";
import type { Goal, Sex } from "@/lib/types";
import { emptyForm, useHackro, type OnboardingForm } from "@/lib/hackro/store";
import { Btn, Chip, Field, Input } from "./ui";

const GOALS: { value: Goal; label: string; desc: string }[] = [
  { value: "build", label: "Build", desc: "Add muscle, keep fat gain slow" },
  { value: "cut", label: "Cut", desc: "Lose fat, keep your muscle" },
  { value: "maintain", label: "Maintain", desc: "Hold your weight, eat well" },
  { value: "perform", label: "Perform", desc: "Fuel training and recovery" },
];
const DIETS = ["omnivore", "vegetarian", "vegan", "pescatarian"] as const;
const ALLERGENS: [string, string][] = [
  ["milk", "Milk"],
  ["egg", "Egg"],
  ["wheat", "Wheat"],
  ["soy", "Soy"],
  ["tree nut", "Tree nuts"],
  ["peanut", "Peanuts"],
  ["sesame", "Sesame"],
  ["shellfish", "Shellfish"],
  ["fish", "Fish"],
];

function num(v: string, lo: number, hi: number) {
  const n = +v;
  return v !== "" && !isNaN(n) && n >= lo && n <= hi;
}

export default function Onboarding() {
  const { completeOnboarding, loading, error } = useHackro();
  const [f, setF] = useState<OnboardingForm>(emptyForm);
  const [diet, setDiet] = useState<string>("omnivore");
  const [allergens, setAllergens] = useState<string[]>([]);
  const set = (p: Partial<OnboardingForm>) => setF((prev) => ({ ...prev, ...p }));

  const valid =
    !!f.name.trim() &&
    !!f.sex &&
    num(f.age, 13, 100) &&
    num(f.ft, 4, 7) &&
    num(f.inch || "0", 0, 11) &&
    num(f.lb, 80, 400) &&
    f.days !== null &&
    !!f.goal;

  function submit() {
    const restrictions = [
      ...(diet !== "omnivore" ? [diet] : []),
      ...allergens,
    ];
    void completeOnboarding({ ...f, restrictions });
  }

  const toggleAllergen = (a: string) =>
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <span className="text-3xl font-bold tracking-[0.3em]">HACKRO</span>
        <h1 className="text-2xl font-bold">Build your plan</h1>
        <p className="text-muted">
          We use these for your energy math. Everything is saved to your profile.
        </p>
      </header>

      <Field label="First name">
        <Input
          value={f.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="What should we call you?"
          autoComplete="given-name"
        />
      </Field>

      <Field label="Sex for energy math">
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as Sex[]).map((v) => (
            <Chip key={v} on={f.sex === v} onClick={() => set({ sex: v })}>
              {v[0].toUpperCase() + v.slice(1)}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Age">
          <Input
            inputMode="numeric"
            value={f.age}
            onChange={(e) => set({ age: e.target.value })}
            placeholder="years"
          />
        </Field>
        <Field label="Weight (lb)">
          <Input
            inputMode="numeric"
            value={f.lb}
            onChange={(e) => set({ lb: e.target.value })}
            placeholder="lb"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Height (ft)">
          <Input
            inputMode="numeric"
            value={f.ft}
            onChange={(e) => set({ ft: e.target.value })}
            placeholder="ft"
          />
        </Field>
        <Field label="Height (in)">
          <Input
            inputMode="numeric"
            value={f.inch}
            onChange={(e) => set({ inch: e.target.value })}
            placeholder="in"
          />
        </Field>
      </div>

      <Field label="Training days / week">
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Chip key={d} on={f.days === d} onClick={() => set({ days: d })}>
              {d}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Goal">
        <div className="flex flex-col gap-2">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set({ goal: g.value })}
              aria-pressed={f.goal === g.value}
              className={`flex items-center gap-3 rounded-2xl bg-surface p-4 text-left transition ${
                f.goal === g.value ? "ring-2 ring-lime" : "hover:bg-surface-2"
              }`}
            >
              <span
                className={`h-5 w-5 flex-none rounded-full ${
                  f.goal === g.value ? "bg-lime" : "ring-2 ring-muted-2 ring-inset"
                }`}
              />
              <span className="flex-1">
                <span className="block font-semibold">{g.label}</span>
                <span className="block text-sm text-muted">{g.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Diet">
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <Chip key={d} on={diet === d} onClick={() => setDiet(d)}>
              {d === "omnivore" ? "No restriction" : d[0].toUpperCase() + d.slice(1)}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Allergies">
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map(([v, l]) => (
            <Chip key={v} on={allergens.includes(v)} onClick={() => toggleAllergen(v)}>
              {l}
            </Chip>
          ))}
        </div>
      </Field>

      {error && <p className="text-sm text-garnet-t">{error}</p>}

      <div className="pt-2 pb-8">
        <Btn onClick={submit} disabled={!valid || loading}>
          {loading ? "Building…" : "Build my plan"}
        </Btn>
      </div>
    </div>
  );
}
