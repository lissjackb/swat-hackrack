"use client";
import { useHackro } from "@/lib/hackro/store";
import { Card, MacroBar } from "./ui";

const zero = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function Today() {
  const { form, targets, progress, whoop, loading, error, date } = useHackro();

  const daily = targets?.daily ?? zero;
  const eaten = progress?.eaten ?? zero;
  const toGoProtein = Math.max(0, Math.round(daily.protein - eaten.protein));
  const prettyDate = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-6">
      <header className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          {prettyDate}
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-sm font-semibold">
          {(form.name || "?")[0].toUpperCase()}
        </span>
      </header>

      {error && (
        <Card className="text-sm text-garnet-t">Couldn&apos;t load your day: {error}</Card>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold leading-tight">
          {loading
            ? "Loading your day…"
            : toGoProtein > 0
              ? `${toGoProtein}g protein to go`
              : "Protein goal hit"}
        </h1>
        <p className="text-muted">
          {form.goal ? `${form.goal[0].toUpperCase() + form.goal.slice(1)} plan` : "Your plan"} ·{" "}
          {form.days ?? 0} training days
        </p>
      </div>

      {/* Calories */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-5xl font-bold tabular-nums">{Math.round(eaten.calories)}</div>
            <div className="text-muted">of {daily.calories} kcal</div>
          </div>
          {whoop && (
            <div className="text-right text-sm">
              <div className="font-semibold text-lime">Recovery {whoop.recovery}%</div>
              <div className="text-muted-2">Strain {whoop.strain}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <MacroBar label="Protein" eaten={eaten.protein} target={daily.protein} color="var(--lime)" />
          <MacroBar label="Carbs" eaten={eaten.carbs} target={daily.carbs} color="#ff9432" />
          <MacroBar label="Fat" eaten={eaten.fat} target={daily.fat} color="#c9ced4" />
        </div>
      </Card>

      {/* Whoop note */}
      {whoop && targets?.breakdown.note && (
        <Card className="text-sm text-muted">{targets.breakdown.note}</Card>
      )}

      {/* How the targets were computed */}
      {targets && (
        <Card className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            How we got your targets
          </span>
          <div className="flex justify-between">
            <span className="text-muted">BMR (Mifflin-St Jeor)</span>
            <span className="tabular-nums">{targets.breakdown.bmr} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">
              TDEE (× {targets.breakdown.activityFactor})
            </span>
            <span className="tabular-nums">{targets.breakdown.tdee} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Protein target</span>
            <span className="tabular-nums">
              {targets.breakdown.proteinGPerKg} g/kg · {daily.protein} g
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
