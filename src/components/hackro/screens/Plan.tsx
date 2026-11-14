"use client";
// vPlan (mockup 1183–1202).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { DAYS, fmt } from "@/lib/planner";
import { Ic } from "../Icon";
import { MealRow } from "../MealRow";
import { XcNote } from "../ui";

export function Plan() {
  const { S, E, A } = useHackro();
  const day = S.planDay;
  const T = E.targets();
  const pl = E.plan(day);
  const tot = E.dayTotals(day);
  const nx = day === "sat" ? E.nextMeal() : null;
  const st = E.planStatus(day);
  const pct = (tot.k / T.kcal) * 100 - 100;
  return (
    <div className="bd">
      <header className="row sb">
        <div className="row" style={sx("gap:8px")}>
          {Object.entries(DAYS).map(([k, d]) => (
            <button key={k} className={`chip ${day === k ? "on" : ""}`} onClick={() => A.planDay(k as "sat" | "sun")}>{d.label}</button>
          ))}
        </div>
      </header>
      <div className="g" style={sx("gap:8px;margin-top:-16px")}>
        <h1 className="h1">{fmt(T.kcal)} kcal and {T.p} g protein across {pl.length} meals</h1>
        <p className="sub">{day === "sat" ? "All from Saturday's Dining Center menu." : "Sunday runs brunch, dinner and 5th Meal."}</p>
      </div>
      <div style={sx("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px")}>
        <div><div className="n" style={sx("font-size:34px")}>{fmt(tot.k)}</div><div className="lbl" style={sx("margin-top:8px")}>kcal planned</div></div>
        <div><div className="n" style={sx("font-size:34px;color:var(--lime)")}>{Math.round(tot.p)}<span style={sx("font-size:18px")}>g</span></div><div className="lbl" style={sx("margin-top:8px")}>Protein planned</div></div>
        <div><div className="n" style={sx("font-size:34px")}>{pct >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(0)}<span style={sx("font-size:18px")}>%</span></div><div className="lbl" style={sx("margin-top:8px")}>vs target</div></div>
      </div>
      {st.ok ? null : <p style={sx("margin:-16px 0 0;font-size:14px;color:var(--amber)")}>{st.msg}</p>}
      <section className="card" style={sx("padding:8px;display:flex;flex-direction:column;gap:2px")} aria-label="Meal timeline">
        {pl.map((x) => <MealRow key={x.m.id} x={x} next={!!nx && nx.m.id === x.m.id} />)}
        <div style={sx("padding:4px 12px 10px")}><XcNote /></div>
      </section>
      <div className="g" style={sx("gap:4px")}>
        <button className="cta" onClick={() => A.regen(day)}><Ic i="i-refresh" />Regenerate {DAYS[day].short === "Sat" ? "Saturday" : "Sunday"}</button>
        <button className="ghost" onClick={() => A.open("goals")}><Ic i="i-sliders" s="width:18px;height:18px" />Edit goals and diet</button>
      </div>
      <p className="note" style={sx("margin:0;text-align:center")}>Calories and macros are Hackro estimates per serving.</p>
    </div>
  );
}
