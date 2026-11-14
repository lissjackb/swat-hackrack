"use client";
// vFood (mockup 1257–1288).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { profileOf } from "@/lib/hackro/store";
import { itemIcon, tagsText, NOW } from "@/lib/hackro/helpers";
import { DAYS, aName, allergenState, allergiesOf, conflict, dispName, mealById, otherOf, qty } from "@/lib/planner";
import { Ic } from "../Icon";
import { Donut, Legend } from "../charts";
import { TopBack, XcNote } from "../ui";

export function Food({ arg }: { arg: string }) {
  const { S, E, A } = useHackro();
  const sep = arg.indexOf("|");
  const name = arg.slice(0, sep);
  const mealId = arg.slice(sep + 1);
  const it = E.findItem(name, mealId);
  const m = mealById(mealId)!;
  if (!it) return null;
  const p = profileOf(S);
  const n = it.nut;
  const c = conflict(it, p);
  const tg = tagsText(it);
  const t = n ? { k: n[0], p: n[1], c: n[2], f: n[3] } : null;
  const st = allergenState(it);
  const up = m.day === NOW.day && E.plan(m.day).some((y) => y.m.id === mealId && E.isUp(y));
  const inPlan = E.plan(m.day).some((y) => y.m.id === mealId && y.parts.some((pp) => pp.it.name === name));
  const isNever = (S.p.never || []).includes(name);
  return (
    <div className="bd">
      <TopBack label={`${m.name} · ${E.stationsOf(name, mealId).join(", ")}`} onBack={() => A.back()} />
      <div className="row" style={sx("gap:16px;align-items:flex-start;margin-top:-8px")}>
        <span className="tile" style={sx("width:64px;height:64px;border-radius:16px;background:var(--s1);color:var(--tx)")}>
          <Ic i={itemIcon(it)} s="width:30px;height:30px;stroke-width:1.5" />
        </span>
        <div className="g" style={sx("gap:8px")}>
          <h1 className="h1">{dispName(it)}</h1>
          <p className="sub">{n ? `${n[1]}g protein for ${n[0]} kcal per ${qty(n[4], n[5])}` : "Nutrition estimate not available"}</p>
        </div>
      </div>
      {c ? (
        <div className="card row" style={sx("gap:10px;background:rgba(255,90,90,.1)")}>
          <Ic i="i-alert" s="color:var(--red)" />
          <span style={sx("flex:1;font-weight:600")} className="warn">{c}</span>
          <span className="t2" style={sx("font-size:13px")}>Hidden from your plan</span>
        </div>
      ) : null}
      {t ? <div className="row" style={sx("gap:24px")}><Donut t={t} /><Legend t={t} /></div> : null}
      {n && n[0] ? (
        <div className="card row" style={sx("gap:16px")}>
          <div className="n" style={sx("font-size:44px;color:var(--lime)")}>{((n[1] / n[0]) * 100).toFixed(1)}<span style={sx("font-size:18px")}> g</span></div>
          <div>
            <div className="lbl">Protein per 100 kcal</div>
            <div className="t2" style={sx("font-size:13px;margin-top:6px")}>
              {(n[1] / n[0]) * 100 >= 8 ? "High: a strong pick for protein targets" : (n[1] / n[0]) * 100 >= 4 ? "Moderate" : "Low: mostly carbs or fat"}
            </div>
          </div>
        </div>
      ) : null}
      <section className="g" aria-label="Labels">
        <span className="lbl">Dining Center labels</span>
        <div className="card list" style={sx("padding:0 16px")}>
          {st.state === "contains" ? (
            <div className="row" style={sx("padding:14px 0;align-items:flex-start")}>
              <Ic i="i-alert" s="color:var(--red);margin-top:1px" />
              <span style={sx("flex:1")}><span style={sx("display:block;font-weight:600")} className="warn">Contains: {st.list.map(aName).join(", ")}</span></span>
            </div>
          ) : st.state === "none" ? (
            <div className="row" style={sx("padding:14px 0;align-items:flex-start")}>
              <Ic i="i-shield" s="color:var(--green);margin-top:1px" />
              <span style={sx("flex:1;font-weight:600")} className="ok">Labeled: none of the major allergens</span>
            </div>
          ) : (
            <div className="row" style={sx("padding:14px 0;align-items:flex-start")}>
              <Ic i="i-info" s="color:var(--t3);margin-top:1px" />
              <span style={sx("flex:1")}>
                <span style={sx("display:block;font-weight:600;color:var(--t2)")}>No allergen data</span>
                <span className="t3" style={sx("display:block;font-size:13px;margin-top:2px")}>
                  Dining Services didn&apos;t label this item{allergiesOf(p).length || otherOf(p) ? ", so it's left out of your plan" : ""}.
                </span>
              </span>
            </div>
          )}
          <div className="row" style={sx("padding:14px 0;align-items:flex-start")}>
            <span className="t2" style={sx("width:96px;flex:none")}>Diet</span>
            <span style={sx("flex:1")}>{tg.diet.length ? tg.diet.join(", ") : "—"}</span>
          </div>
          {c ? (
            <div className="row" style={sx("padding:14px 0")}>
              <Ic i="i-alert" s="color:var(--red)" />
              <span style={sx("flex:1;font-weight:600")} className="warn">{c}</span>
            </div>
          ) : st.state !== "nodata" ? (
            <div className="row" style={sx("padding:14px 0")}>
              <Ic i="i-check" s="color:var(--green)" />
              <span style={sx("flex:1;font-weight:600")} className="ok">Fits your diet and allergies</span>
            </div>
          ) : null}
        </div>
      </section>
      <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:8px")}>
        {!c && up && !inPlan ? (
          <button className="cta inr" style={sx("border-radius:16px")} onClick={() => A.addToPlan(name, mealId)}><Ic i="i-plus" />Add to plan</button>
        ) : (
          <button className="cta inr" style={sx("border-radius:16px")} disabled>{inPlan ? "In your plan" : c ? "Not recommended" : "Add to plan"}</button>
        )}
        {m.day === NOW.day ? (
          <button className="ghost fill" onClick={() => A.logThis(name, mealId)}>Log this</button>
        ) : (
          <button className="ghost fill" disabled style={sx("color:var(--t3)")}>Log on {DAYS[m.day].short}</button>
        )}
      </div>
      {isNever ? (
        <button className="ghost" onClick={() => A.unnever(name)}><Ic i="i-refresh" s="width:18px;height:18px" />Bring it back to your plans</button>
      ) : (
        <button className="ghost" onClick={() => A.never(name, mealId)} style={sx("color:var(--garnet-t)")}><Ic i="i-ban" s="width:18px;height:18px" />Never again</button>
      )}
      <section className="g" aria-label="Where">
        <span className="lbl">Where to get it</span>
        <div className="card row">
          <span className="tile"><Ic i="i-building" /></span>
          <div style={sx("flex:1")}>
            <div style={sx("font-weight:600")}>Dining Center · {E.stationsOf(name, mealId).join(", ")}</div>
            <div className="t2" style={sx("font-size:13px;margin-top:2px")}>
              {DAYS[m.day].label} · {m.kind === "snack" ? "breakfast" : m.name.toLowerCase()} {m.kind === "snack" ? mealById("sat-b")!.hours : m.hours}
            </div>
          </div>
        </div>
      </section>
      <XcNote />
      <p className="note" style={sx("margin:0")}>Nutrition is a Hackro estimate per serving; check NetNutrition for official values.</p>
    </div>
  );
}
