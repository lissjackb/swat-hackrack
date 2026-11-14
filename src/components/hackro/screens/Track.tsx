"use client";
// vTrack — the Goals tab (mockup 1345–1404). The Whoop "Training today" tile
// reads the real snapshot + computed dev (PLANNER_SPEC, not hard-coded 150).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { fmtDate, goalPlan } from "@/lib/hackro/helpers";
import { REWARDS } from "@/lib/hackro/data";
import { GOALS, WHOOP, fmt } from "@/lib/planner";
import { Ic } from "../Icon";
import { GoalText } from "../AiBits";

export function Track() {
  const { S, E, A } = useHackro();
  const { e, T } = E.completion();
  const hit = E.todayHit();
  const streak = hit ? 1 : 0;
  const pl = E.plan("sat");
  const O = E.overInfo();
  const freezes = 0; /* streak freezes unlock at day 3; none earned yet in this demo */
  const logged = pl.filter((x) => E.mealDone(x)).length;
  const p = S.p;
  const goal = p.goal ?? "maintain";
  const goals: [string, string, number, boolean, string, React.ReactNode][] = [
    ["Protein", `${Math.round(e.p)} / ${T.p} g`, e.p / (T.p * 0.9), e.p >= T.p * 0.9, "#B8F135", `At least ${Math.round(T.p * 0.9)} g`],
    ["Calories in range", `${fmt(e.k)} / ${fmt(T.kcal)}`, O.overRange ? 1 : e.k / O.lo, e.k >= O.lo && e.k <= O.hi, O.overRange ? "#E35D73" : "#FFB020",
      O.overRange
        ? <span style={sx("color:var(--garnet-t)")}>Over by {fmt(e.k - O.hi)} · range ends at {fmt(O.hi)}</span>
        : `${fmt(O.lo)}–${fmt(O.hi)} kcal for a ${GOALS[goal].label.toLowerCase()}`],
    ["Check off every meal", `${logged} / ${pl.length}`, logged / pl.length, logged === pl.length, "#F5F6F7", "Bonus, not needed for the streak"],
  ];
  const toGo = goals.slice(0, 2).filter((g) => !g[3]).length;
  const pace = { build: "+0.25 to 0.75 lb a week", cut: "−0.5 to 1 lb a week", maintain: "Within 1 lb of today", perform: "Hold weight, fuel every session" }[goal];
  const week: [string, number][] = [["Mon", 9], ["Tue", 10], ["Wed", 11], ["Thu", 12], ["Fri", 13], ["Sat", 14], ["Sun", 15]];
  const nr = REWARDS.find((r) => r[0] > streak);
  const prev = [...REWARDS].reverse().find((r) => r[0] <= streak);
  const base = prev ? prev[0] : 0;
  const wear = S.wear;
  const hasRec = !!S.device && !!S.perms.recovery && !!wear;
  const gp = goalPlan(p.bodyGoal, p);
  const next = gp && !gp.same ? gp.ms![0] : null;
  return (
    <div className="bd">
      <header className="row sb">
        <span className="lbl">Goals · {GOALS[goal].label}</span>
        <button onClick={() => A.open("goals")} style={sx("height:36px;color:var(--garnet-t);font:600 14px Inter,sans-serif")}>Edit</button>
      </header>
      <div className="g" style={sx("gap:8px;margin-top:-16px")}>
        <h1 className="h1">
          {O.overRange ? `Over your ${GOALS[goal].label.toLowerCase()} range today` : hit ? "Day hit. Your streak has started" : `${toGo} goal${toGo > 1 ? "s" : ""} left to start your streak`}
        </h1>
        <p className="sub">
          {O.overRange
            ? (freezes ? "A streak freeze will cover today, so your streak is safe." : `No streak freeze yet (they unlock at day 3), so today won't count. Protein still matters: keep logging.`)
            : `A day counts when you hit protein and land between ${fmt(O.lo)} and ${fmt(O.hi)} kcal.`}
        </p>
      </div>
      <section className="card g" style={sx("gap:20px")} aria-label="Streak">
        <div className="row" style={sx("gap:16px")}>
          <span style={sx(`width:64px;height:64px;border-radius:16px;background:${streak ? "rgba(255,148,50,.14)" : "var(--s2)"};color:${streak ? "var(--orange)" : "var(--t3)"};display:flex;align-items:center;justify-content:center;flex:none`)}>
            <Ic i="i-flame" s="width:32px;height:32px;stroke-width:1.5" />
          </span>
          <div style={sx("flex:1")}>
            <div><span className="n" style={sx("font-size:56px")}>{streak}</span><span className="u" style={sx("font-size:15px")}> day streak</span></div>
            <div className="t2" style={sx("font-size:13px;margin-top:4px")}>Best {streak} · started tracking today</div>
          </div>
        </div>
        {nr ? (
          <div className="g" style={sx("gap:8px")}>
            <div className="row sb" style={sx("font-size:14px")}>
              <span><span className="t2">Next reward </span><b style={sx("font-weight:600")}>{nr[1]}</b></span>
              <span className="u">{nr[0] - streak} day{nr[0] - streak > 1 ? "s" : ""} to go</span>
            </div>
            <div className="tr" style={sx("height:6px")}>
              <div className="fl" style={sx(`width:${(((streak - base) / (nr[0] - base)) * 100).toFixed(0)}%;background:var(--orange)`)} />
            </div>
          </div>
        ) : null}
        <div style={sx("display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;text-align:center")}>
          {week.map(([d, n]) => {
            const today = n === 14, past = n < 14;
            const bg = today ? (hit ? "var(--orange)" : "transparent") : "transparent";
            const ring = today ? (hit ? "var(--orange)" : O.overRange ? "var(--garnet-t)" : "var(--tx)") : past ? "transparent" : "var(--line)";
            return (
              <div key={d} className="g" style={sx("gap:8px;align-items:center")}>
                <span className="lbl" style={sx(`font-size:12px;${today ? "color:var(--tx)" : ""}`)}>{d}</span>
                <span style={sx(`width:36px;height:36px;border-radius:999px;background:${past ? "var(--s2)" : bg};box-shadow:inset 0 0 0 1.5px ${ring};display:flex;align-items:center;justify-content:center;color:${today && hit ? "#08090A" : "var(--t3)"}`)}>
                  {today && hit
                    ? <Ic i="i-check" s="width:16px;height:16px;stroke-width:3" />
                    : <span className="n" style={sx(`font-size:15px;color:${today ? "var(--tx)" : past ? "#5A6068" : "var(--t3)"}`)}>{n}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="g" aria-label="Today's goals">
        <div className="row sb"><span className="lbl">Today&apos;s goals</span><span className="u">{goals.filter((g) => g[3]).length} of {goals.length} done</span></div>
        <div className="card list" style={sx("padding:0 16px")}>
          {goals.map(([l, v, pr, ok, c, d]) => (
            <div key={l} className="g" style={sx("gap:10px;padding:16px 0")}>
              <div className="row">
                <span style={sx(`width:24px;height:24px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${ok ? "var(--lime)" : "transparent"};box-shadow:inset 0 0 0 1.5px ${ok ? "var(--lime)" : "#5A6068"};color:#08090A`)}>
                  {ok ? <Ic i="i-check" s="width:14px;height:14px;stroke-width:3" /> : null}
                </span>
                <span style={sx("flex:1")}>
                  <span style={sx("display:block;font-weight:600")}>{l}</span>
                  <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{d}</span>
                </span>
                <span className="n" style={sx("font-size:18px")}>{v}</span>
              </div>
              <div className="tr"><div className="fl" style={sx(`width:${Math.min(100, pr * 100).toFixed(1)}%;background:${c}`)} /></div>
            </div>
          ))}
        </div>
        {!hit ? <button className="cta" onClick={() => A.tab("today")}><Ic i="i-check" />Check off a meal</button> : null}
      </section>
      <section className="g" aria-label="Weekly report">
        <span className="lbl">Weekly report</span>
        <button className="card row" onClick={() => A.open("week")} style={sx("width:100%;text-align:left")}>
          <span className="tile"><Ic i="i-trend" /></span>
          <span style={sx("flex:1")}>
            <span style={sx("display:block;font-weight:600")}>This week, Nov 9–15</span>
            <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Protein, calories and streak, written up by Claude</span>
          </span>
          <Ic i="i-chev" s="width:18px;height:18px;color:var(--t3)" />
        </button>
      </section>
      <section className="g" aria-label="Streak rewards">
        <div className="row sb"><span className="lbl">Streak rewards</span><span className="u">{REWARDS.filter((r) => r[0] <= streak).length} of {REWARDS.length} unlocked</span></div>
        <div className="card list" style={sx("padding:0")}>
          {REWARDS.map(([d, n, desc, icn]) => {
            const got = streak >= d;
            return (
              <div key={n} className="li" style={got ? undefined : sx("opacity:.7")}>
                <span className="tile" style={got ? sx("background:rgba(255,148,50,.16);color:var(--orange)") : undefined}><Ic i={icn} /></span>
                <span style={sx("flex:1;min-width:0")}>
                  <span style={sx("display:block;font-weight:600")}>{n}</span>
                  <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{desc}</span>
                </span>
                {got ? (
                  <span className="row" style={sx("gap:4px;font-size:13px;font-weight:600;color:var(--orange)")}>
                    <Ic i="i-check" s="width:14px;height:14px;stroke-width:2.75" />Unlocked
                  </span>
                ) : <span className="u">Day {d}</span>}
              </div>
            );
          })}
        </div>
      </section>
      <section className="g" aria-label="This week">
        <span className="lbl">This week</span>
        <div className="card g" style={sx("gap:12px")}>
          <div className="row sb">
            <span style={sx("font-weight:600")}>Hit 5 of 7 days</span>
            <span><span className="n" style={sx("font-size:22px")}>{streak}</span><span className="u"> / 5</span></span>
          </div>
          <div style={sx("display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px")}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} style={sx(`height:6px;border-radius:999px;background:${i < streak ? "var(--orange)" : "var(--line)"}`)} />
            ))}
          </div>
        </div>
      </section>
      <section className="g" aria-label="Body goal">
        <span className="lbl">Body goal</span>
        {!gp || gp.same ? (
          <div className="card g" style={sx("gap:14px")}>
            <div className="row">
              <span className="tile"><Ic i="i-trend" /></span>
              <span style={sx("flex:1")}>
                <span style={sx("display:block;font-weight:600")}>{GOALS[goal].label} · {p.lb} lb</span>
                <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Target pace {pace}</span>
              </span>
            </div>
            <button className="cta inr" onClick={() => A.open("bodygoal")}>Set a goal</button>
          </div>
        ) : (
          <div className="card g" style={sx("gap:14px")}>
            <div className="row sb">
              <div>
                <div className="n" style={sx("font-size:30px")}>{gp.cur} → {gp.tgt}<span className="u"> lb</span></div>
                <div className="t2" style={sx("font-size:13px;margin-top:4px")}>By {fmtDate(gp.end!)} · {gp.rate!.toFixed(1)} lb a week · {gp.weeks} weeks</div>
              </div>
              <button onClick={() => A.open("goals")} style={sx("height:36px;color:var(--garnet-t);font:600 14px Inter,sans-serif")}>Edit</button>
            </div>
            <div className="tr" style={sx("height:6px")}><div className="fl" style={sx("width:2%;background:var(--lime)")} /></div>
            <div className="row sb" style={sx("font-size:14px")}>
              <span className="t2">Next milestone · {fmtDate(next!.date)}</span>
              <span className="n" style={sx("font-size:18px")}>{next!.lb.toFixed(1)} lb</span>
            </div>
            {gp.why ? <p style={sx("margin:0;font-size:13px;line-height:1.5;color:var(--amber)")}>{gp.why}</p> : null}
            <div style={sx("font-size:14px;line-height:1.5")}>
              <div style={sx("margin-bottom:4px")}>
                <span style={sx("display:inline-flex;align-items:center;gap:4px;font:600 11px Inter,sans-serif;letter-spacing:.3px;color:var(--t3);text-transform:uppercase")}>
                  <Ic i="i-bolt" s="width:11px;height:11px" />{p.bodyGoal!.edits ? "Claude · Haiku" : "Claude · Sonnet"}
                </span>
              </div>
              <GoalText g={p.bodyGoal!} model={p.bodyGoal!.edits ? "haiku" : "sonnet"} />
            </div>
          </div>
        )}
      </section>
      {!S.device && S.whoop === "no" ? null : (
        <section className="g" aria-label="Training">
          <span className="lbl">Training today</span>
          {S.device ? (hasRec ? (
            <div className="card list" style={sx("padding:0")}>
              <div className="li">
                <span className="tile"><Ic i="i-bolt" /></span>
                <span style={sx("flex:1")}>
                  <span style={sx("display:block;font-weight:600")}>Strain today</span>
                  <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>
                    {wear!.strain >= WHOOP.STRAIN_HIGH ? "High" : wear!.strain >= WHOOP.STRAIN_MED ? "Moderate" : "Light"} · {T.dev ? `targets raised ${T.dev} kcal, mostly carbs` : "no target change"}
                  </span>
                </span>
                <span className="n" style={sx("font-size:22px;color:var(--blue)")}>{wear!.strain}</span>
              </div>
            </div>
          ) : (
            <button className="card row" onClick={() => A.auth("whoop")} style={sx("width:100%;text-align:left")}>
              <span className="tile"><Ic i="i-band" /></span>
              <span style={sx("flex:1")}>
                <span style={sx("display:block;font-weight:600")}>Strain is off</span>
                <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Share strain and recovery from Whoop</span>
              </span>
              <Ic i="i-chev" s="width:18px;height:18px;color:var(--t3)" />
            </button>
          )) : (
            <button className="card row" onClick={() => A.go("connect")} style={sx("width:100%;text-align:left")}>
              <span className="tile"><Ic i="i-band" /></span>
              <span style={sx("flex:1")}>
                <span style={sx("display:block;font-weight:600")}>Connect Whoop</span>
                <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Track workouts and strain next to your food goals</span>
              </span>
              <Ic i="i-chev" s="width:18px;height:18px;color:var(--t3)" />
            </button>
          )}
        </section>
      )}
    </div>
  );
}
