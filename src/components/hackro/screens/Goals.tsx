"use client";
// vGoals — Edit goals & diet, pushed from Track/You/Plan (mockup 1505–1521).
// Reuses the onboarding step bodies in compact form against S.draft.
import { Fragment } from "react";
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { ObBody, type ObKey } from "./Onboarding";
import { GoalPreview } from "./BodyGoal";
import { TopBack } from "../ui";

export function Goals() {
  const { S, A } = useHackro();
  const d = S.draft;
  if (!d) return null;
  const order: ObKey[] = ["goal", "train", "avoid", "basics"];
  return (
    <div className="bd">
      <TopBack label="Goals & diet" onBack={() => A.back()} />
      <div className="g" style={sx("gap:8px;margin-top:-8px")}>
        <h1 className="h1">Change a goal and the plan rebuilds from the same menu</h1>
      </div>
      {order.map((st, i) => (
        <Fragment key={st}>
          {i > 0 ? <div style={sx("height:1px;background:var(--line)")} /> : null}
          <section className="g" style={sx("gap:24px")}>
            <ObBody step={st} p={d} compact />
          </section>
        </Fragment>
      ))}
      <div style={sx("height:1px;background:var(--line)")} />
      <section className="g" style={sx("gap:16px")}>
        <span className="lbl">Body goal</span>
        <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:12px")}>
          <label className="field">
            <span>Target weight</span>
            <div className="row" style={sx("height:52px;border-radius:16px;background:var(--s1);padding:0 16px;gap:8px")}>
              <input className="inp" style={sx("background:transparent;padding:0;height:50px;flex:1;min-width:0;box-shadow:none")}
                type="number" inputMode="decimal" value={(d.bodyGoal || {}).target ?? ""} placeholder={String(d.lb)}
                onChange={(e) => A.bgField("target", e.target.value)} />
              <span className="u">lb</span>
            </div>
          </label>
          <label className="field">
            <span>Target date</span>
            <input className="inp" type="date" value={(d.bodyGoal || {}).date ?? ""} onChange={(e) => A.bgField("date", e.target.value)} />
          </label>
        </div>
        <div><GoalPreview g={d.bodyGoal} p={d} /></div>
      </section>
      <button className="cta" onClick={() => A.saveGoals()}>Save and rebuild plan</button>
    </div>
  );
}
