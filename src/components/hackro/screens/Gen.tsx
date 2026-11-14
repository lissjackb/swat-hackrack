"use client";
// vGen (mockup 937–951) — the "building your plan" interstitial.
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { allergiesOf, fmt, type PlannerProfile } from "@/lib/planner";
import { Ic } from "../Icon";
import { Spinner } from "../ui";

export function Gen() {
  const { S, E } = useHackro();
  const T = E.targets();
  const n = S.gen;
  const steps = [
    `Reading Saturday's Dining Center menu`,
    `Filtering ${E.itemsFor("sat-b").length + E.itemsFor("sat-l").length + E.itemsFor("sat-d").length} items for your diet${allergiesOf(S.p as unknown as PlannerProfile).length ? " and allergies" : ""}`,
    `Setting targets: ${fmt(T.kcal)} kcal, ${T.p}g protein`,
    `Balancing ${E.mealsOfDay("sat").length} meals across 9 stations`,
  ];
  return (
    <div className="bd" style={sx("padding-top:64px")} aria-busy="true">
      <div className="g" style={sx("gap:8px")}>
        <span className="lbl">Building your plan</span>
        <h1 className="h1">Matching your goals to what&apos;s being served</h1>
      </div>
      <div className="g" style={sx("gap:16px")} role="status">
        {steps.map((s, i) => (
          <div key={i} className="check" style={sx(`opacity:${i <= n ? 1 : 0.35};transition:opacity .3s`)}>
            <span className="dot" style={sx(`background:${i < n ? "var(--lime)" : "var(--s2)"};color:#08090A`)}>
              {i < n ? <Ic i="i-check" s="width:14px;height:14px;stroke-width:3" /> : i === n ? <Spinner /> : null}
            </span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div className="card g" style={sx("gap:14px")}>
        <div className="sk" style={sx("height:13px;width:36%")} />
        <div className="sk" style={sx("height:22px;width:84%")} />
        <div className="sk" style={sx("height:14px;width:60%")} />
        <div className="row" style={sx("gap:20px")}>
          <div className="sk" style={sx("height:28px;width:80px")} />
          <div className="sk" style={sx("height:28px;width:80px")} />
        </div>
      </div>
      <div className="card g" style={sx("gap:14px;opacity:.6")}>
        <div className="sk" style={sx("height:13px;width:30%")} />
        <div className="sk" style={sx("height:22px;width:70%")} />
        <div className="sk" style={sx("height:14px;width:52%")} />
      </div>
    </div>
  );
}
