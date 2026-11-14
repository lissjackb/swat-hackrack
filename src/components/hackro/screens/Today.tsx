"use client";
// vToday (mockup 1129–1181). The Whoop tiles read the store's `wear`
// snapshot (real recovery/strain), not the mockup's hard-coded WEAR
// (PLANNER_SPEC "Client").
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { listNames, title, NOW } from "@/lib/hackro/helpers";
import { DAYS, dispName, fmt, partText, type MealPlan } from "@/lib/planner";
import { Ic } from "../Icon";
import { Concentric, Ring, type ConcentricRow } from "../charts";
import { MealRow } from "../MealRow";
import { DaySummary, PlateWhy } from "../AiBits";
import { ABadge, Cbox, XcNote } from "../ui";

export function Today() {
  const { S, E, A } = useHackro();
  const { e, T } = E.completion();
  const nx = E.nextMeal();
  const pl = E.plan("sat");
  const left = pl.filter((x) => !E.mealDone(x));
  const pLeft = Math.max(0, Math.round(T.p - e.p));
  const O = E.overInfo();
  const trimmedMeals = pl.filter((x) => x.trimmed);
  const adjMeals = pl.filter((x) => x.trimmed || x.boosted);
  const head = O.over > 0
    ? `${fmt(O.over)} kcal over today's target`
    : left.length
      ? `${pLeft}g protein to go across ${left.length} meal${left.length > 1 ? "s" : ""}`
      : "Every meal checked off. Day complete.";
  const bkDone = pl.some((x) => x.m.id === "sat-b" && E.mealDone(x));
  const sub = nx
    ? (nx.m.kind === "snack"
      ? `Your snack is ${title(nx.parts).toLowerCase()}${bkDone ? ", around 3:30 PM." : " from breakfast. Grab it before 11."}`
      : `${nx.m.name} is open ${nx.m.hours}. Start with ${nx.parts[0] ? nx.parts[0].it.name.replace(/ FZ$/, "").toLowerCase() : "what fits"}.`)
    : (left.length ? "Check off anything you ate that is still open." : "Sunday brunch is ready in Plan.");
  const sub2 = O.over > 0
    ? (pLeft > 0 && nx
      ? `Still ${pLeft}g protein to go. ${listNames(trimmedMeals.map((x) => x.m.name.toLowerCase())) || "The rest of today"} ${trimmedMeals.length > 1 ? "are" : "is"} cut down to the lean protein.`
      : `One day doesn't move your trend. Brunch tomorrow starts fresh.`)
    : adjMeals.length
      ? `Rebalanced around what you've actually eaten: ${listNames(adjMeals.map((x) => `${x.m.name.toLowerCase()} ${(x.deltaK ?? 0) > 0 ? "+" : "−"}${fmt(Math.abs(x.deltaK ?? 0))} kcal`))}.`
      : sub;
  const R: ConcentricRow[] = [
    ["Calories", e.k, T.kcal, "#FFB020", "", "#E35D73"],
    ["Protein", e.p, T.p, "#B8F135", " g"],
    ["Carbs", e.c, T.c, "#FF9432", " g"],
    ["Fat", e.f, T.f, "#C9CED4", " g"],
  ];

  // Whoop strip: real snapshot values (store.wear) drive the rings.
  const wear = S.wear;
  const hasRec = !!S.device && !!S.perms.recovery && !!wear;
  const fuel = hasRec ? wear!.recovery : null;
  const devN = [fuel != null, hasRec, hasRec].filter(Boolean).length;
  const dev = S.device && !devN ? (
    <button className="card row" onClick={() => A.auth("whoop")} style={sx("width:100%;text-align:left")}>
      <span className="tile"><Ic i="i-band" /></span>
      <span style={sx("flex:1")}>
        <span style={sx("display:block;font-weight:600")}>Whoop connected</span>
        <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Share recovery to get a Fuel Score</span>
      </span>
      <Ic i="i-chev" s="width:18px;height:18px;color:var(--t3)" />
    </button>
  ) : S.device ? (
    <div style={sx(`display:grid;grid-template-columns:repeat(${devN},minmax(0,1fr));width:100%`)}>
      {fuel != null ? (
        <button onClick={() => A.open("fuel")} aria-label={`Fuel Score ${fuel}. Open breakdown`} className="g" style={sx("align-items:center;gap:8px")}>
          <Ring size={64} sw={5} pct={fuel} color="#B8F135" inner={<span className="n" style={sx("font-size:21px")}>{fuel}</span>} />
          <span className="lbl" style={sx("font-size:12px")}>Fuel</span>
        </button>
      ) : null}
      {hasRec ? (
        <div className="g" style={sx("align-items:center;gap:8px")}>
          <Ring size={64} sw={5} pct={wear!.recovery} color="#B8F135" inner={<span className="n" style={sx("font-size:21px")}>{wear!.recovery}<span style={sx("font-size:13px")}>%</span></span>} />
          <span className="lbl" style={sx("font-size:12px")}>Recovery</span>
        </div>
      ) : null}
      {hasRec ? (
        <div className="g" style={sx("align-items:center;gap:8px")}>
          <Ring size={64} sw={5} pct={(wear!.strain / 21) * 100} color="#4DA3FF" inner={<span className="n" style={sx("font-size:21px")}>{wear!.strain}</span>} />
          <span className="lbl" style={sx("font-size:12px")}>Strain today</span>
        </div>
      ) : null}
    </div>
  ) : S.whoop === "no" ? null : (
    <button className="card row" onClick={() => A.go("connect")} style={sx("width:100%;text-align:left")}>
      <span className="tile"><Ic i="i-band" /></span>
      <span style={sx("flex:1")}>
        <span style={sx("display:block;font-weight:600")}>Get your Fuel Score</span>
        <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Connect Whoop and choose what it shares</span>
      </span>
      <Ic i="i-chev" s="width:18px;height:18px;color:var(--t3)" />
    </button>
  );

  const nxAte = nx ? new Set(S.ate[nx.m.id] || []) : new Set<string>();
  const pj = adjMeals.length ? E.dayProjection() : null;

  return (
    <div className="bd">
      <header className="row sb">
        <span className="lbl">{DAYS.sat.label} · {NOW.label}</span>
        <button onClick={() => A.tab("you")} aria-label="Profile"
          style={sx("width:36px;height:36px;border-radius:999px;background:var(--s2);display:flex;align-items:center;justify-content:center;font:600 15px Inter,sans-serif")}>
          {(S.p.name || "?")[0].toUpperCase()}
        </button>
      </header>
      <div className="g" style={sx("gap:8px;margin-top:-16px")}>
        <h1 className="h1">{head}</h1>
        <p className="sub">{sub2}</p>
      </div>
      <section className="g" style={sx("gap:24px;align-items:center")} aria-label="Day completion">
        <div style={sx("position:relative;width:248px;height:248px")} role="img"
          aria-label={`Eaten so far: ${R.map((r) => `${r[0]} ${Math.round(r[1])} of ${Math.round(r[2])}`).join(", ")}`}>
          <Concentric list={R} />
          <div style={sx("position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px")}>
            <span className="n" style={sx("font-size:46px")}>{fmt(e.k)}</span>
            <span className="u" style={sx("margin-top:2px")}>of {fmt(T.kcal)} kcal</span>
            {O.over > 0 ? <span className="lbl" style={sx("font-size:12px;color:var(--garnet-t);margin-top:4px")}>{fmt(O.over)} over</span> : null}
          </div>
        </div>
        <div style={sx("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:100%")}>
          {R.map(([l, v, max, c, u, oc]) => (
            <div key={l}>
              <div className="row" style={sx("gap:6px")}>
                <span style={sx(`width:8px;height:8px;border-radius:2px;background:${c}`)} />
                <span className="lbl" style={sx("font-size:12px")}>{l}</span>
              </div>
              <div className="n" style={sx("font-size:22px;margin-top:8px")}>{fmt(v)}</div>
              {oc && v > max
                ? <div className="u" style={sx("font-size:12px;margin-top:2px;color:var(--garnet-t)")}>+{fmt(v - max)} over</div>
                : <div className="u" style={sx("font-size:12px;margin-top:2px")}>of {fmt(max)}{u}</div>}
            </div>
          ))}
        </div>
        {dev}
      </section>
      {adjMeals.length ? (
        <section className="card g" style={sx("gap:12px")} aria-label="Plan rebalanced">
          <div className="row" style={sx("gap:10px")}>
            <Ic i="i-sliders" s="color:var(--amber)" />
            <span style={sx("flex:1;font-weight:600")}>Rest of today rebalanced</span>
            <span className="u">target {fmt(O.T.kcal)} kcal</span>
          </div>
          {pj ? (
            <p className="t2" style={sx("margin:0;font-size:13px")}>
              Day now lands at {fmt(pj.t.k)} kcal and {Math.round(pj.t.p)} g protein.
              {pj.msg ? <span style={sx("color:var(--amber)")}> {pj.msg}</span> : null}
            </p>
          ) : null}
          {adjMeals.map((x) => (
            <button key={x.m.id} className="row" onClick={() => A.open(`meal:${x.m.id}`)} style={sx("width:100%;text-align:left;font-size:14px")}>
              <span style={sx("flex:1;min-width:0")}>
                <span style={sx("font-weight:600")}>{x.m.name}</span>
                <span className="t2">
                  {x.removed && x.removed.length
                    ? ` · drops ${x.removed.map((n) => n.replace(/ FZ$/, "").toLowerCase()).join(", ")}`
                    : x.boosted ? " · bigger portions" : " · smaller portions"}
                </span>
              </span>
              <span className="n" style={sx("font-size:17px;color:var(--amber)")}>{(x.deltaK ?? 0) > 0 ? "+" : "−"}{fmt(Math.abs(x.deltaK ?? 0))}</span>
              <span className="u">{" "}kcal · {(x.deltaP ?? 0) >= 0 ? "+" : "−"}{Math.abs(Math.round(x.deltaP ?? 0))} g P</span>
            </button>
          ))}
        </section>
      ) : null}
      {nx ? <NextMealCard nx={nx} nxAte={nxAte} /> : null}
      <section className="g" aria-label="Today's meals">
        <div className="row sb"><span className="lbl">Today&apos;s meals</span><span className="u">Check off what you ate</span></div>
        <div className="card" style={sx("padding:8px;display:flex;flex-direction:column;gap:2px")}>
          {pl.map((x) => <MealRow key={x.m.id} x={x} next={!!nx && nx.m.id === x.m.id} />)}
          <div style={sx("padding:4px 12px 10px")}><XcNote /></div>
        </div>
      </section>
      <DaySummary />
      <section className="g" aria-label="Logged outside the plan">
        <div className="row sb">
          <span className="lbl">Outside the plan</span>
          {S.extras.length ? (
            <span className="u">{fmt(S.extras.reduce((a, x) => a + x.k, 0))} kcal · {Math.round(S.extras.reduce((a, x) => a + x.p, 0))}g protein</span>
          ) : null}
        </div>
        {S.extras.length ? (
          <div className="card list" style={sx("padding:0")}>
            {S.extras.map((x, i) => (
              <div key={i} className="li">
                <span className="tile"><Ic i="i-plus" /></span>
                <span style={sx("flex:1;min-width:0")}>
                  <span style={sx("display:block;font-weight:600")}>{x.name}</span>
                  <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{fmt(x.k)} kcal · {Math.round(x.p)}g protein · {x.src}</span>
                  <ABadge hits={x.hits || []} />
                </span>
                <button className="ib" style={sx("width:36px;height:36px;background:var(--s2);color:var(--t2)")}
                  onClick={() => A.rmExtra(i)} aria-label={`Remove ${x.name}`}>
                  <Ic i="i-x" s="width:16px;height:16px" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <button className="ghost fill" onClick={() => A.openLog()}><Ic i="i-plus" s="width:18px;height:18px" />Log something else</button>
      </section>
    </div>
  );
}

function NextMealCard({ nx, nxAte }: { nx: MealPlan; nxAte: Set<string> }) {
  const { E, A } = useHackro();
  return (
    <section className="card g" style={sx("gap:16px")} aria-label="Next meal">
      <div className="row sb">
        <span className="lbl" style={sx("color:var(--tx)")}>Next · {nx.m.name} {nx.m.kind === "snack" ? "" : nx.m.hours}</span>
        <span className="t2" style={sx("font-size:13px")}>{nx.m.kind === "snack" ? "3:30 PM" : "Dining Center"}</span>
      </div>
      <div className="g" style={sx("gap:10px")}>
        {nx.parts.map((pp) => {
          const on = nxAte.has(pp.it.name);
          return (
            <div key={pp.it.name} className="row">
              <Cbox state={on} onClick={() => A.eatItem(nx.m.id, pp.it.name)} label={`${on ? "Unmark" : "Mark"} ${pp.it.name} as eaten`} />
              <button onClick={() => A.open(`food:${pp.it.name}|${nx.m.id}`)} aria-label={`Nutrition for ${pp.it.name}`}
                style={sx(`flex:1;min-width:0;text-align:left;${on ? "opacity:.55;text-decoration:line-through;text-decoration-color:var(--t3)" : ""}`)}>
                <span className="row" style={sx("gap:4px")}>
                  <span>{dispName(pp.it)}</span>
                  <Ic i="i-chev" s="width:14px;height:14px;color:var(--t3)" />
                </span>
                <span className="t2" style={sx("display:block;font-size:12px;margin-top:1px")}>
                  {partText(pp)} · {fmt(pp.it.nut![0] * pp.m)} kcal · {Math.round(pp.it.nut![1] * pp.m)}g protein{pp.from ? " · swapped in" : ""}
                </span>
              </button>
              <button className="ib" style={sx("width:36px;height:36px;background:var(--s2);color:var(--t2)")}
                onClick={() => A.iswap(nx.m.id, pp.from || pp.it.name)} aria-label={`Swap ${pp.it.name}`}>
                <Ic i="i-swap" s="width:16px;height:16px" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="row" style={sx("gap:28px")}>
        <div><span className="n" style={sx("font-size:30px;color:var(--lime)")}>{Math.round(nx.tot.p)}</span><span className="u"> g protein</span></div>
        <div><span className="n" style={sx("font-size:30px")}>{fmt(nx.tot.k)}</span><span className="u"> kcal</span></div>
      </div>
      <div style={sx("display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:8px")}>
        {nxAte.size ? (
          <button className="cta inr" onClick={() => A.finish(nx.m.id)}><Ic i="i-check" />Done · skip {E.skipped(nx)}</button>
        ) : (
          <button className="cta inr" onClick={() => A.eat(nx.m.id)}><Ic i="i-check" />Ate it all</button>
        )}
        <button className="ghost fill" onClick={() => A.open(`swap:${nx.m.id}`)}>New meal</button>
      </div>
      <PlateWhy x={nx} />
      <XcNote />
    </section>
  );
}
