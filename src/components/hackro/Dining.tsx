"use client";
import { useEffect, useState } from "react";
import type { MenuItemDTO } from "@/lib/types";
import { api } from "@/lib/hackro/api";
import { useHackro } from "@/lib/hackro/store";
import { Card, Chip } from "./ui";

const MEALS = ["breakfast", "lunch", "dinner"] as const;

export default function Dining() {
  const { date } = useHackro();
  const [meal, setMeal] = useState<(typeof MEALS)[number]>("breakfast");
  const [items, setItems] = useState<MenuItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setItems(null);
    setError(null);
    api
      .getMenu(date, meal)
      .then((rows) => active && setItems(rows))
      .catch((e) => active && setError((e as Error).message));
    return () => {
      active = false;
    };
  }, [date, meal]);

  // Group by station for readability.
  const byStation = new Map<string, MenuItemDTO[]>();
  for (const it of items ?? []) {
    const k = it.station ?? "Menu";
    byStation.set(k, [...(byStation.get(k) ?? []), it]);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          Dining Center · Swarthmore
        </span>
        <h1 className="text-2xl font-bold">Today&apos;s menu</h1>
      </header>

      <div className="flex gap-2">
        {MEALS.map((m) => (
          <Chip key={m} on={meal === m} onClick={() => setMeal(m)}>
            {m[0].toUpperCase() + m.slice(1)}
          </Chip>
        ))}
      </div>

      {error && <Card className="text-sm text-garnet-t">Couldn&apos;t load the menu: {error}</Card>}
      {!items && !error && <p className="text-muted">Loading menu…</p>}
      {items && items.length === 0 && <p className="text-muted">No items for {meal}.</p>}

      {[...byStation.entries()].map(([station, rows]) => (
        <section key={station} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-2">
            {station}
          </h2>
          <Card className="flex flex-col divide-y divide-line p-0">
            {rows.map((it) => (
              <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{it.name}</div>
                  <div className="text-sm text-muted">
                    {it.calories > 0 ? `${Math.round(it.calories)} kcal · ${Math.round(it.protein)}g protein` : "No nutrition data"}
                    {it.dietary.length > 0 && (
                      <span className="text-muted-2"> · {it.dietary.join(", ")}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
