"use client";
// Claude-written UI text, ported from the mockup: plateWhy (818–825),
// daySummary (826–841), goalText (1443–1448). Every number comes from the
// engine/store; Claude writes words only, with the template fallback shown
// until (unless) /api/ai answers. Per PLANNER_SPEC, "high-strain day" is said
// only when the REAL strain ≥ 14 (not merely connected).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { useAiText } from "@/lib/hackro/ai";
import { fmtDate, goalPlan, title } from "@/lib/hackro/helpers";
import { GOALS, WHOOP, dispName, fmt, partText, shortName, type MealPlan } from "@/lib/planner";
import { AiTag } from "./ui";

export function PlateWhy({ x }: { x: MealPlan }) {
  const { S, E } = useHackro();
  const T = E.targets();
  const ps = x.parts.slice().sort((a, b) => b.it.nut![1] * b.m - a.it.nut![1] * a.m);
  const lead = ps[0];
  const carb = x.parts.find((pp) => ["C", "X"].includes(pp.it.nut![6]) && pp !== lead);
  const leadP = lead ? Math.round(lead.it.nut![1] * lead.m) : 0;
  const strain = !!S.device && !!S.perms.recovery && !!S.wear && S.wear.strain >= WHOOP.STRAIN_HIGH;
  const fb = lead
    ? `Leads with ${shortName(lead.it).toLowerCase()} for ${leadP} g protein${strain ? " because it's a high-strain day" : ` toward your ${T.p} g target`}${carb ? `, with ${shortName(carb.it).toLowerCase()} for the carbs${T.dev ? " Whoop added" : ""}` : ""}.${x.boosted ? " Portions are up to cover what you skipped." : x.trimmed ? " Portions are trimmed to keep today in range." : ""}`
    : "";
  const data = {
    meal: x.m.name,
    goal: S.p.goal ? GOALS[S.p.goal].label : "",
    items: x.parts.map((pp) => ({ name: dispName(pp.it), portion: partText(pp), protein_g: Math.round(pp.it.nut![1] * pp.m), kcal: Math.round(pp.it.nut![0] * pp.m) })),
    plate_kcal: Math.round(x.tot.k),
    plate_protein_g: Math.round(x.tot.p),
    high_strain_day: strain,
    whoop_added_kcal: T.dev,
    adjusted: x.boosted ? "bigger to cover skipped food" : x.trimmed ? "smaller to stay in range" : "as planned",
  };
  const ai = useAiText("plate_why", data, fb);
  if (!lead) return null;
  return (
    <div className="row" style={sx("gap:8px;align-items:flex-start;padding-top:2px")}>
      <div style={sx("flex:1;font-size:14px;line-height:1.5")}>
        <div style={sx("margin-bottom:4px")}><AiTag label="Claude · why this plate" /></div>
        <span className="t2">{ai.text}</span>
      </div>
    </div>
  );
}

export function DaySummary() {
  const { E } = useHackro();
  const { e, T } = E.completion();
  const [lo, hi] = E.rangeK(T);
  const pl = E.plan("sat");
  const sl = E.slack();
  const logged = pl.filter((x) => E.mealDone(x)).length;
  const tomorrow = E.plan("sun");
  const bt = tomorrow[0];
  const lead = bt ? bt.parts.slice().sort((a, b) => b.it.nut![1] * b.m - a.it.nut![1] * a.m)[0] : null;
  const rows: [string, string, boolean][] = [
    ["Protein", `${Math.round(e.p)} / ${T.p} g`, e.p >= T.p * 0.9 - sl.p],
    ["Calories", `${fmt(e.k)} / ${fmt(T.kcal)}`, e.k >= lo - sl.k && (e.k <= hi || sl.flex)],
    ["Meals logged", `${logged} / ${pl.length}`, logged === pl.length],
  ];
  const pShort = Math.max(0, Math.round(T.p - e.p));
  const fb = `${rows[0][2] ? "Protein is on target" : `You're ${pShort} g short on protein so far`}${sl.flex ? ", with a flex meal folded in" : ""}. Tomorrow: ${lead ? `start brunch with ${shortName(lead.it).toLowerCase()}, the biggest protein on the menu.` : "check Plan for brunch."}`;
  const data = {
    protein_g: Math.round(e.p), protein_target_g: T.p, kcal: Math.round(e.k), kcal_target: T.kcal,
    kcal_range: [lo, hi], meals_logged: logged, meals_planned: pl.length, flex_meal: sl.flex,
    skipped_kcal: Math.round(sl.k), tomorrow_brunch_top_protein_item: lead ? dispName(lead.it) : null,
  };
  const ai = useAiText("daily_summary", data, fb);
  return (
    <section className="card g" style={sx("gap:14px")} aria-label="Today so far">
      <div className="row sb"><span className="lbl">Today so far</span><AiTag /></div>
      <div className="g" style={sx("gap:8px")}>
        {rows.map(([l, v, ok]) => (
          <div key={l} className="row" style={sx("font-size:14px")}>
            <span style={{
              ...sx("width:20px;height:20px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;color:#08090A"),
              background: ok ? "var(--lime)" : "transparent",
              boxShadow: `inset 0 0 0 1.5px ${ok ? "var(--lime)" : "#5A6068"}`,
            }}>
              {ok ? <svg className="i" style={sx("width:12px;height:12px;stroke-width:3")} aria-hidden="true"><use href="#i-check" /></svg> : null}
            </span>
            <span style={sx("flex:1")}>{l}</span>
            <span className="n" style={sx("font-size:17px")}>{v}</span>
          </div>
        ))}
      </div>
      <p className="t2" style={sx("margin:0;font-size:14px;line-height:1.5")}>{ai.text}</p>
    </section>
  );
}

export function GoalText({ g, model }: { g: { target: number | string; date: string }; model: "haiku" | "sonnet" }) {
  const { S } = useHackro();
  const gp = goalPlan(g, S.p);
  const data = gp && !gp.same
    ? {
        current_lb: gp.cur, target_lb: gp.tgt, requested_date: fmtDate(gp.want!), plan_end_date: fmtDate(gp.end!),
        weeks: gp.weeks, lb_per_week: +gp.rate!.toFixed(2), weekly_cap_pct_body_weight: gp.capPct! * 100,
        date_extended: gp.extended, low_bmi_cut_rule: gp.capPct! < 0.01,
        goal: S.p.goal ? GOALS[S.p.goal].label : "",
      }
    : null;
  const fb = gp && !gp.same
    ? `${gp.dir === "gain" ? "Gain" : "Lose"} about ${gp.rate!.toFixed(1)} lb a week to go from ${gp.cur} to ${gp.tgt} lb by ${fmtDate(gp.end!)}.${gp.extended ? ` That's later than ${fmtDate(gp.want!)} so the pace stays under ${(gp.capPct! * 100).toFixed(gp.capPct! < 0.01 ? 1 : 0)}% of body weight a week.` : " That pace is within the safe range."}`
    : "";
  const ai = useAiText("goal_plan", data ?? {}, fb, model);
  if (!gp || gp.same) return null;
  return <span className="t2">{ai.text}</span>;
}

export { title };
