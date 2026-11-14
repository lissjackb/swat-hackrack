"use client";
// vSwap (mockup 1236–1255).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { itemIcon, title } from "@/lib/hackro/helpers";
import { fmt, mealById } from "@/lib/planner";
import { Ic } from "../Icon";
import { TopBack } from "../ui";

export function Swap({ id }: { id: string }) {
  const { S, E, A } = useHackro();
  const m = mealById(id)!;
  const x = E.plan(m.day).find((y) => y.m.id === id);
  if (!x) return null;
  const cur = x.pick ? x.pick.main : "";
  const alts = x.ranked.filter((r) => r.main !== cur).slice(0, 3);
  const sel = S.swapSel;
  const match = (r: { err: number }) => Math.max(60, Math.min(99, Math.round(100 - r.err * 55)));
  const T = E.targets();
  return (
    <div className="bd">
      <TopBack label={`Swap ${m.name.toLowerCase()}`} onBack={() => A.back()} />
      <div className="g" style={sx("gap:8px;margin-top:-8px")}>
        <h1 className="h1">{alts[0] ? `${title(alts[0].parts).split(",")[0]} is a ${match(alts[0])}% match` : "No other options fit today"}</h1>
        <p className="sub">
          Replacing {title(x.parts).toLowerCase()} · <span className="n" style={sx("font-size:17px;color:var(--tx)")}>{fmt(x.tot.k)}</span> kcal · <span className="n" style={sx("font-size:17px;color:var(--tx)")}>{Math.round(x.tot.p)}</span>g protein
        </p>
      </div>
      <section className="g" aria-label="Options">
        {alts.map((r) => (
          <button key={r.main} className={`opt ${sel === r.main ? "on" : ""}`} onClick={() => A.swapSel(r.main)}
            aria-pressed={sel === r.main} style={sx("flex-direction:column;align-items:stretch;gap:14px")}>
            <span className="row">
              <span className="tile"><Ic i={itemIcon(r.parts[0].it)} /></span>
              <span style={sx("flex:1;min-width:0")}>
                <span style={sx("display:block;font:600 16px/1.3 Inter,sans-serif;text-wrap:balance")}>{title(r.parts)}</span>
                <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>
                  {[...new Set(r.parts.flatMap((pp) => E.stationsOf(pp.it.name, id)))].join(", ")}
                </span>
              </span>
              <span style={sx("text-align:right")}>
                <span className="n" style={sx("display:block;font-size:26px;color:var(--lime)")}>{match(r)}%</span>
                <span className="u">match</span>
              </span>
            </span>
            <span style={sx("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--s2);border-radius:8px;padding:10px 12px")}>
              {([["kcal", fmt(r.t.k)], ["protein", Math.round(r.t.p) + "g"], ["carbs", Math.round(r.t.c) + "g"], ["fat", Math.round(r.t.f) + "g"]] as const).map(([l, v]) => (
                <span key={l}>
                  <span className="n" style={sx("display:block;font-size:18px")}>{v}</span>
                  <span className="u" style={sx("font-size:12px")}>{l}</span>
                </span>
              ))}
            </span>
          </button>
        ))}
      </section>
      <div className="g" style={sx("gap:12px")}>
        <button className="cta" onClick={() => A.swapGo(id)} disabled={!sel}>{sel ? "Swap it in" : "Pick a swap"}</button>
        <p className="note" style={sx("margin:0;text-align:center")}>Your daily target stays at {fmt(T.kcal)} kcal and {T.p}g protein.</p>
      </div>
    </div>
  );
}
