"use client";
// vReveal + howWeGot (mockup 974–1008).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { DAYS, GOALS, fmt, type PlannerTargets } from "@/lib/planner";
import { Ic } from "../Icon";
import { MealRow } from "../MealRow";
import { XcNote } from "../ui";

export function HowWeGot({ T }: { T: PlannerTargets }) {
  const { S } = useHackro();
  const g = GOALS[S.p.goal ?? "maintain"];
  const row = (l: React.ReactNode, v: React.ReactNode, key: string) => (
    <div key={key} className="row sb" style={sx("align-items:flex-start;gap:16px")}>
      <span className="t2">{l}</span>
      <span className="n" style={sx("font-size:18px;white-space:nowrap")}>{v}</span>
    </div>
  );
  return (
    <details className="card" style={sx("padding:16px")}>
      <summary className="row sb" style={sx("cursor:pointer;list-style:none")}>
        <span style={sx("font-weight:600")}>How we got {fmt(T.kcal)} kcal</span>
        <Ic i="i-chev" s="color:var(--t3)" />
      </summary>
      <div className="g" style={sx("gap:10px;margin-top:14px;font-size:14px")}>
        {row("Resting energy (Mifflin-St Jeor)", fmt(T.bmr), "bmr")}
        {row(`× ${T.af}, ${T.afLabel}`, fmt(T.tdee), "tdee")}
        {row(`${g.label}: ${T.adjNote}`, (T.adj >= 0 ? "+" : "−") + fmt(Math.abs(T.adj)), "adj")}
        {T.floored ? (
          <div className="row" style={sx("gap:8px;color:var(--amber)")}>
            <Ic i="i-shield" s="width:16px;height:16px" />
            <span>Set to your safe minimum: {fmt(T.floor)} kcal.</span>
          </div>
        ) : null}
        {T.dev ? row(T.devNote ?? "Whoop adjustment", "+" + T.dev, "dev") : null}
        {row(`Protein at ${g.pk} g/kg`, T.p + "g", "pk")}
      </div>
    </details>
  );
}

export function Reveal() {
  const { S, E, A } = useHackro();
  const T = E.targets();
  const pl = E.plan("sat");
  const tot = E.dayTotals("sat");
  const st = E.planStatus("sat");
  return (
    <div className="bd">
      <div className="g" style={sx("gap:8px;padding-top:24px")}>
        <span className="lbl">Your plan · {DAYS.sat.label}</span>
        <h1 className="h1">{fmt(T.kcal)} kcal and {T.p}g protein, all from the Dining Center</h1>
        <p className="sub">{GOALS[S.p.goal ?? "maintain"].label} for {S.p.days} training days a week. Every item below is on Saturday&apos;s menu.</p>
      </div>
      <div style={sx("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px")}>
        {([["kcal", fmt(T.kcal), "var(--tx)"], ["Protein", T.p + "g", "var(--lime)"], ["Carbs", T.c + "g", "var(--tx)"], ["Fat", T.f + "g", "var(--tx)"]] as const).map(([l, v, c]) => (
          <div key={l}>
            <div className="n" style={sx(`font-size:28px;color:${c}`)}>{v}</div>
            <div className="lbl" style={sx("margin-top:8px")}>{l}</div>
          </div>
        ))}
      </div>
      <section className="card" style={sx("padding:8px")} aria-label="Saturday meals">
        {pl.map((x) => <MealRow key={x.m.id} x={x} noCheck />)}
        <div style={sx("padding:4px 12px 10px")}><XcNote /></div>
      </section>
      <div className="g" style={sx("gap:8px")}>
        <div className="row sb">
          <span className="t2">Planned total</span>
          <span>
            <span className="n" style={sx("font-size:20px")}>{fmt(tot.k)}</span><span className="u"> kcal · </span>
            <span className="n" style={sx("font-size:20px")}>{Math.round(tot.p)}</span><span className="u">g protein</span>
          </span>
        </div>
        {st.ok ? null : <p style={sx("margin:0;font-size:14px;color:var(--amber)")}>{st.msg}</p>}
        <p className="note" style={sx("margin:0")}>Menu and allergen labels from Swarthmore Dining. Calories and macros are Hackro estimates per serving; NetNutrition has the official numbers.</p>
      </div>
      <HowWeGot T={T} />
      <div className="g" style={sx("gap:4px")}>
        <div className="card g" style={sx("gap:14px")}>
          <div className="row">
            <span className="tile"><Ic i="i-band" /></span>
            <span style={sx("flex:1")}>
              <span style={sx("display:block;font:600 17px Inter,sans-serif")}>Do you wear a Whoop?</span>
              <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>It lets strain and recovery adjust your targets each morning</span>
            </span>
          </div>
          <div style={sx("display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px")}>
            <button className="cta inr" onClick={() => A.whoopYes()}>Yes, connect it</button>
            <button className="ghost fill" onClick={() => A.whoopNo()}>No Whoop</button>
          </div>
        </div>
      </div>
    </div>
  );
}
