"use client";
// vMeal (mockup 1204–1234).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { itemIcon, title } from "@/lib/hackro/helpers";
import { dispName, fmt, mealById, partText, qty, sumParts } from "@/lib/planner";
import { Ic } from "../Icon";
import { Donut, Legend } from "../charts";
import { Cbox, XcNote } from "../ui";

export function Meal({ id }: { id: string }) {
  const { S, E, A } = useHackro();
  const day = mealById(id)!.day;
  const x = E.plan(day).find((y) => y.m.id === id);
  if (!x) return null;
  if (E.isFlex(x)) {
    const fx = S.flex[id];
    return (
      <div className="bd">
        <div className="top">
          <button className="ib" onClick={() => A.back()} aria-label="Back"><Ic i="i-back" /></button>
          <span className="lbl">{x.m.name} · flex</span><span />
        </div>
        <div className="g" style={sx("gap:8px;margin-top:-8px")}>
          <h1 className="h1">{x.m.name} was a flex meal</h1>
          <p className="sub">{fx.est ? "No numbers entered, so we assumed about what was planned." : "Logged from your estimate."} The rest of today rebalanced around it, and your streak is safe.</p>
        </div>
        <div className="row" style={sx("gap:24px")}>
          <Donut t={{ k: fx.k, p: fx.p, c: fx.c, f: fx.f }} />
          <Legend t={{ p: fx.p, c: fx.c, f: fx.f }} />
        </div>
        <div className="g" style={sx("gap:4px")}>
          <button className="cta" onClick={() => A.flex(id)}>Edit the estimate</button>
          <button className="ghost" onClick={() => A.unflex(id)}>Undo flex</button>
        </div>
      </div>
    );
  }
  const ate = new Set(S.ate[id] || []);
  const eaten = !!x.pick && E.mealDone(x);
  const canCheck = day === "sat";
  const eatT = sumParts(E.eatenParts(x));
  const partial = (eaten || ate.size > 0) && eatT.k < x.tot.k - 5;
  const all = x.parts;
  const sts = [...new Set(all.flatMap((pp) => E.stationsOf(pp.it.name, id)))];
  const bkDone = E.plan("sat").some((y) => y.m.id === "sat-b" && E.mealDone(y));
  return (
    <div className="bd">
      <div className="top">
        <button className="ib" onClick={() => A.back()} aria-label="Back"><Ic i="i-back" /></button>
        <span className="lbl">{x.m.name} · {x.m.kind === "snack" ? "3:30 PM" : x.m.hours}</span><span />
      </div>
      <div className="g" style={sx("gap:8px;margin-top:-8px")}>
        <h1 className="h1">{title(x.parts)}</h1>
        <p className="sub">
          {x.m.kind === "snack"
            ? (bkDone ? "Around 3:30 PM, 2.5 hours before dinner." : "Take these to go from the Field of Greens at breakfast.")
            : `Dining Center · ${sts.join(", ")}`}
        </p>
        {partial ? (
          <p style={sx("margin:4px 0 0;font-size:15px")}>
            <span className="n" style={sx("font-size:22px")}>{fmt(eatT.k)}</span>
            <span className="t2"> of {fmt(x.tot.k)} planned kcal eaten · {Math.round(eatT.p)} of {Math.round(x.tot.p)} g protein</span>
          </p>
        ) : null}
      </div>
      <div className="row" style={sx("gap:24px")}><Donut t={x.tot} /><Legend t={x.tot} /></div>
      {x.removed && x.removed.length ? (
        <div className="card row" style={sx("gap:10px;align-items:flex-start")}>
          <Ic i="i-sliders" s="color:var(--amber);margin-top:1px" />
          <div style={sx("font-size:14px;line-height:1.5")}>
            <b style={sx("font-weight:600")}>Trimmed to keep today in range.</b>
            <span className="t2"> Dropped {x.removed.map((n) => n.replace(/ FZ$/, "").toLowerCase()).join(", ")}{x.origK ? `, ${fmt(x.origK - x.tot.k)} kcal lighter` : ""}.</span>
          </div>
        </div>
      ) : null}
      <section className="g" aria-label="Items">
        <div className="row sb">
          <span className="lbl">What&apos;s in it</span>
          <span className="u">{canCheck ? "Swap any item · check what you ate" : "Swap any item"}</span>
        </div>
        <div className="card list" style={sx("padding:0 16px")}>
          {all.map((pp) => {
            const on = ate.has(pp.it.name);
            return (
              <div key={pp.it.name} className="row" style={sx("padding:14px 0")}>
                <button className="tile" onClick={() => A.open(`food:${pp.it.name}|${id}`)} aria-label={`About ${pp.it.name}`}>
                  <Ic i={itemIcon(pp.it)} />
                </button>
                <button style={sx("flex:1;min-width:0;text-align:left")} onClick={() => A.open(`food:${pp.it.name}|${id}`)}>
                  <span style={sx("display:block;font-weight:600")}>{dispName(pp.it)}</span>
                  <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>
                    {partText(pp)} · {fmt(pp.it.nut![0] * pp.m)} kcal · {Math.round(pp.it.nut![1] * pp.m)}g protein
                    {pp.from ? <span style={sx("display:block;margin-top:2px;color:var(--t3)")}>Swapped in for {pp.from.toLowerCase()}</span> : null}
                    {pp.orig && pp.m < pp.orig - 1e-6 ? <span style={sx("display:block;margin-top:2px;color:var(--amber)")}>Trimmed from {qty(pp.it.nut![4] * pp.orig, pp.it.nut![5])}</span> : null}
                  </span>
                </button>
                <button className="ib" style={sx("width:36px;height:36px;background:var(--s2);color:var(--t2)")}
                  onClick={() => A.iswap(id, pp.from || pp.it.name)} aria-label={`Swap ${pp.it.name}`}>
                  <Ic i="i-swap" s="width:16px;height:16px" />
                </button>
                {canCheck ? (
                  <span style={sx("padding-right:10px")}>
                    <Cbox state={on} onClick={() => A.eatItem(id, pp.it.name)} label={`${on ? "Unmark" : "Mark"} ${pp.it.name} as eaten`} />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
      <XcNote />
      <div className="g" style={sx("gap:4px")}>
        {day !== "sat" ? (
          <button className="cta" disabled>Available Sunday</button>
        ) : eaten ? (
          <>
            <button className="cta" disabled><Ic i="i-check" />Logged{E.skipped(x) ? ` · skipped ${E.skipped(x)}` : ""}</button>
            <button className="ghost" onClick={() => A.eatMeal(id)}>Undo</button>
          </>
        ) : ate.size ? (
          <>
            <button className="cta" onClick={() => A.finish(id)}><Ic i="i-check" />Done eating · skip {E.skipped(x)}</button>
            <button className="ghost" onClick={() => A.eat(id)}>I ate it all</button>
          </>
        ) : (
          <button className="cta" onClick={() => A.eat(id)}><Ic i="i-check" />Ate it all</button>
        )}
        {eaten ? null : <button className="ghost" onClick={() => A.open(`swap:${id}`)}><Ic i="i-refresh" s="width:18px;height:18px" />Get a whole new meal</button>}
      </div>
    </div>
  );
}
