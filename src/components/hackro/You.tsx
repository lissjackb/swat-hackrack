"use client";
import { formToProfileInput, useHackro } from "@/lib/hackro/store";
import { Btn, Card } from "./ui";

export default function You() {
  const { form, profileId, signOut, refreshDay } = useHackro();
  const input = formToProfileInput(form);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-2xl font-semibold">
          {(form.name || "?")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{form.name || "You"}</h1>
          <p className="text-sm text-muted">
            {input.goal[0].toUpperCase() + input.goal.slice(1)} · {input.weightKg} kg · Swarthmore
          </p>
        </div>
      </header>

      <Card className="flex flex-col gap-2 text-sm">
        <Row label="Height" value={`${input.heightCm} cm`} />
        <Row label="Weight" value={`${input.weightKg} kg`} />
        <Row label="Age" value={`${input.age}`} />
        <Row label="Sex" value={input.sex} />
        <Row label="Activity" value={input.activityLevel} />
        <Row
          label="Restrictions"
          value={input.restrictions.length ? input.restrictions.join(", ") : "None"}
        />
        <Row label="Profile ID" value={profileId ?? "—"} mono />
      </Card>

      <Btn variant="ghost" onClick={() => void refreshDay()}>
        Refresh today
      </Btn>
      <Btn variant="ghost" onClick={signOut}>
        Sign out
      </Btn>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
