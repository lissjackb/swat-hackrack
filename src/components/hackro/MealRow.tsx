"use client";
// One meal row in the timeline, ported from the mockup's mealRow (953–972).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { clock, ampm, title, NOW } from "@/lib/hackro/helpers";
import { fmt, sumParts, type MealPlan } from "@/lib/planner";
import { Cbox } from "./ui";

export function MealRow({ x, next, noCheck }: { x: MealPlan; next?: boolean; noCheck?: boolean }) {
  const { S, E, A } = useHackro();
  const fx = E.isFlex(x) ? S.flex[x.m.id] : null;
  const done = E.mealDone(x), part = !done && E.mealStarted(x), nx = next;
  const canCheck = x.m.day === NOW.day && !noCheck;
  const up = canCheck && E.isUp(x);
  const eatK = fx ? fx.k : sumParts(E.eatenParts(x)).k;
  const showEaten = !fx && (done || part) && eatK < x.tot.k - 5;
  const hours = x.m.kind === "snack"
    ? (E.mealDone(E.plan("sat").find((y) => y.m.id === "sat-b") ?? ({ m: { id: "sat-b" }, parts: [] } as unknown as MealPlan)) ? "3:30 PM" : x.m.hours)
    : "Dining Center · " + x.m.hours;
  const adjOn = !!x.deltaK && Math.abs(x.deltaK) >= 20;
  return (
    <div className="row" style={sx(`gap:0;border-radius:16px;${nx ? "background:var(--s2)" : ""}`)}>
      <button className="meal" onClick={() => A.open(`meal:${x.m.id}`)} style={sx(`flex:1;${done ? "opacity:.6" : ""}`)}>
        <span className="mt" style={nx ? sx("color:var(--tx)") : undefined}>
          {clock(x.m.time)}
          <span style={sx("display:block;font-size:12px;margin-top:3px;color:var(--t3)")}>{ampm(x.m.time)}</span>
        </span>
        <span style={sx("min-width:0")}>
          <span className="lbl" style={nx ? sx("color:var(--lime)") : undefined}>
            {x.m.name}{fx ? " · Flex" : ""}{nx ? " · Next" : ""}{part ? " · Partly eaten" : ""}
            {!fx && done && E.skipped(x) ? ` · Skipped ${E.skipped(x)}` : ""}
            {adjOn ? <span style={sx("color:var(--amber)")}> · {x.deltaK! > 0 ? "+" : "−"}{fmt(Math.abs(x.deltaK!))} kcal</span> : null}
          </span>
          <span style={sx("display:block;font:600 16px/1.3 Inter,sans-serif;margin-top:6px;text-wrap:balance")}>
            {fx ? `Flex meal${fx.est ? " · assumed as planned" : ""}` : x.parts.length ? title(x.parts) : "Skipped to stay in range"}
          </span>
          <span className="t2" style={sx("display:block;font-size:13px;margin-top:3px")}>{fx ? "Eaten off-plan" : hours}</span>
        </span>
        <span style={sx("text-align:right;line-height:1.35")}>
          {showEaten ? (
            <>
              <span className="n" style={sx("display:block;font-size:18px")}>{fmt(eatK)}</span>
              <span className="u">of {fmt(x.tot.k)}</span>
            </>
          ) : (
            <>
              <span className="n" style={sx("display:block;font-size:18px")}>{fmt(fx ? fx.k : x.tot.k)}</span>
              <span className="u">{Math.round(fx ? fx.p : x.tot.p)}g P</span>
            </>
          )}
        </span>
      </button>
      {up ? (
        <button className="chip" style={sx("height:32px;padding:0 10px;margin-right:6px;background:var(--s2);font-size:12px")}
          onClick={() => A.flex(x.m.id)} aria-label={`Make ${x.m.name} a flex meal`}>Flex</button>
      ) : null}
      {fx && canCheck ? (
        <button className="chip" style={sx("height:32px;padding:0 10px;margin-right:12px;background:var(--s2);font-size:12px")}
          onClick={() => A.unflex(x.m.id)}>Undo</button>
      ) : canCheck && x.parts.length ? (
        <span style={sx("padding:0 18px 0 2px")}>
          <Cbox state={done ? true : part ? "mixed" : false} onClick={() => A.eatMeal(x.m.id)}
            label={`${done ? "Unmark" : "Mark"} ${x.m.name} as eaten`} />
        </span>
      ) : null}
    </div>
  );
}
