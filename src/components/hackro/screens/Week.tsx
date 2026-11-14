"use client";
// vWeek — the weekly report (mockup 1463–1477).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { useAiText } from "@/lib/hackro/ai";
import { GOALS, fmt } from "@/lib/planner";
import { AiTag, TopBack } from "../ui";

export function Week() {
  const { S, E, A } = useHackro();
  const { e, T } = E.completion();
  const hit = E.todayHit();
  const pl = E.plan("sat");
  const logged = pl.filter((x) => E.mealDone(x)).length;
  const data = {
    days_tracked: 1, week: "Nov 9-15", today_protein_g: Math.round(e.p), protein_target_g: T.p,
    today_kcal: Math.round(e.k), kcal_target: T.kcal, meals_logged: logged, meals_planned: pl.length,
    day_counted_for_streak: hit, streak_days: hit ? 1 : 0, goal: GOALS[S.p.goal ?? "maintain"].label,
  };
  const fb = `Week one, day one: ${Math.round(e.p)} of ${T.p} g protein and ${fmt(e.k)} of ${fmt(T.kcal)} kcal so far, ${logged} of ${pl.length} meals logged. ${hit ? "Today already counts toward your streak." : "Hit protein and land in range to start your streak."} Next week's report compares day to day once there's more than one day logged.`;
  const ai = useAiText("weekly_report", data, fb);
  return (
    <div className="bd">
      <TopBack label="Weekly report · Nov 9–15" onBack={() => A.back()} />
      <div className="g" style={sx("gap:8px;margin-top:-8px")}>
        <h1 className="h1">Your first week starts today</h1>
        <p className="sub">Free for everyone, every Sunday night.</p>
      </div>
      <div style={sx("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px")}>
        <div><div className="n" style={sx("font-size:32px")}>1</div><div className="lbl" style={sx("margin-top:8px")}>Days tracked</div></div>
        <div><div className="n" style={sx("font-size:32px;color:var(--lime)")}>{Math.round(e.p)}<span style={sx("font-size:16px")}> g</span></div><div className="lbl" style={sx("margin-top:8px")}>Avg protein</div></div>
        <div><div className="n" style={sx("font-size:32px")}>{hit ? 1 : 0}</div><div className="lbl" style={sx("margin-top:8px")}>Days hit</div></div>
      </div>
      <section className="card g" style={sx("gap:10px")}>
        <AiTag />
        <p style={sx("margin:0;line-height:1.55")}>{ai.text}</p>
      </section>
    </div>
  );
}
