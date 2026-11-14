"use client";
// vBodyGoal + goalPreview (mockup 1428–1461).
import { useEffect } from "react";
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { TODAY, fmtDate, goalPlan, isoDate } from "@/lib/hackro/helpers";
import type { HackroProfile } from "@/lib/hackro/state";
import { TopBack } from "../ui";

export function GoalPreview({ g, p }: { g: { target: number | string; date: string } | null | undefined; p: Pick<HackroProfile, "lb" | "ft" | "inch" | "goal"> }) {
  const gp = goalPlan(g, p);
  if (!gp) return <p className="note" style={sx("margin:0")}>Enter a target weight and date to see the plan.</p>;
  if (gp.same) return <p className="note" style={sx("margin:0")}>That&apos;s your current weight. Pick a different target, or use Maintain.</p>;
  return (
    <div className="g" style={sx("gap:12px")}>
      <div style={sx("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px")}>
        <div><div className="n" style={sx("font-size:26px")}>{gp.diff! > 0 ? "+" : "−"}{Math.abs(gp.diff!).toFixed(1)}</div><div className="lbl" style={sx("margin-top:6px;font-size:12px")}>lb total</div></div>
        <div><div className="n" style={sx("font-size:26px")}>{gp.rate!.toFixed(2)}</div><div className="lbl" style={sx("margin-top:6px;font-size:12px")}>lb / week</div></div>
        <div><div className="n" style={sx("font-size:26px")}>{gp.weeks}</div><div className="lbl" style={sx("margin-top:6px;font-size:12px")}>weeks</div></div>
      </div>
      {gp.why ? <p style={sx("margin:0;font-size:14px;line-height:1.5;color:var(--amber)")}>{gp.why}</p> : null}
      {gp.mismatch ? <p style={sx("margin:0;font-size:14px;color:var(--garnet-t)")}>{gp.mismatch} Change the target or your goal in Edit goals and diet.</p> : null}
      <div className="card list" style={sx("padding:0 16px;background:var(--s2)")}>
        {gp.ms!.map((m) => (
          <div key={m.w} className="row sb" style={sx("padding:10px 0;font-size:14px")}>
            <span className="t2">Week {m.w} · {fmtDate(m.date)}</span>
            <span className="n" style={sx("font-size:17px")}>{m.lb.toFixed(1)} lb</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BodyGoal() {
  const { S, A } = useHackro();
  const defaultDate = isoDate(new Date(TODAY.getTime() + 12 * 7 * 864e5));
  useEffect(() => {
    if (!S.bgDraft) A.initBgDraft(defaultDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const g = S.bgDraft || { target: "", date: defaultDate };
  return (
    <div className="bd">
      <TopBack label="Set a goal" onBack={() => A.back()} />
      <div className="g" style={sx("gap:8px;margin-top:-8px")}>
        <h1 className="h1">Where do you want to be, and by when?</h1>
        <p className="sub">We&apos;ll build weekly milestones and keep the pace safe: at most 1% of body weight a week.</p>
      </div>
      <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:12px")}>
        <label className="field">
          <span>Target weight</span>
          <div className="row" style={sx("height:52px;border-radius:16px;background:var(--s1);padding:0 16px;gap:8px")}>
            <input className="inp" style={sx("background:transparent;padding:0;height:50px;flex:1;min-width:0;box-shadow:none")}
              type="number" inputMode="decimal" value={g.target} placeholder={String(S.p.lb)}
              onChange={(e) => A.bgField("target", e.target.value)} />
            <span className="u">lb</span>
          </div>
        </label>
        <label className="field">
          <span>Target date</span>
          <input className="inp" type="date" min={isoDate(new Date(TODAY.getTime() + 7 * 864e5))} value={g.date}
            onChange={(e) => A.bgField("date", e.target.value)} />
        </label>
      </div>
      <div><GoalPreview g={g} p={S.p} /></div>
      <button className="cta" onClick={() => A.saveBodyGoal()}>Save goal</button>
    </div>
  );
}
