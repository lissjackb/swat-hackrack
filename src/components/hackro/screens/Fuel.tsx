"use client";
// vFuel (mockup 1290–1307). The hard-coded "+150 kcal / Optimal / 14.2"
// claims are replaced by the real snapshot + computed adjustment
// (PLANNER_SPEC "Replace every hard-coded Whoop claim with the data").
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { fuelBand } from "@/lib/hackro/helpers";
import { DAYS, WHOOP, fmt } from "@/lib/planner";
import { Ic } from "../Icon";
import { Ring } from "../charts";
import { TopBack } from "../ui";

export function Fuel() {
  const { S, E, A } = useHackro();
  const wear = S.wear;
  const rc = !!S.device && !!S.perms.recovery && !!wear;
  const f = rc ? wear!.recovery : null;
  const T = E.targets();
  if (f == null) {
    return (
      <div className="bd">
        <TopBack label={`Fuel score · ${DAYS.sat.label}`} onBack={() => A.back()} />
        <p className="sub">Connect Whoop and share recovery to get a Fuel Score.</p>
      </div>
    );
  }
  const parts: [string, string, number, number, string][] = [
    ["Recovery", `Recovery ${wear!.recovery}% · strain today ${wear!.strain}`, f, wear!.recovery, "#B8F135"],
  ];
  const lead = parts.slice().sort((a, b) => b[2] - a[2])[0];
  return (
    <div className="bd">
      <TopBack label={`Fuel score · ${DAYS.sat.label}`} onBack={() => A.back()} />
      <div className="g" style={sx("gap:8px;margin-top:-8px")}>
        <h1 className="h1">{parts.length > 1 ? `${lead[0]} earned ${lead[2]} of your ${f} points` : `${lead[0]} sets your score today`}</h1>
        <p className="sub">Synced from Whoop this morning.</p>
      </div>
      <div className="row" style={sx("justify-content:center")}>
        <Ring size={200} sw={14} pct={f} color="#B8F135" inner={
          <>
            <span className="n" style={sx("font-size:80px")}>{f}</span>
            <span style={sx("font:600 14px Inter,sans-serif;color:var(--lime);margin-top:4px")}>{fuelBand(wear!.recovery)}</span>
          </>
        } />
      </div>
      <section className="g" aria-label="Contributors">
        <div className="row sb"><span className="lbl">What built it</span><span className="u">points</span></div>
        <div className="card list" style={sx("padding:0 16px")}>
          {parts.map(([l, d, pt, pc, c]) => (
            <div key={l} className="g" style={sx("gap:10px;padding:16px 0")}>
              <div className="row sb" style={sx("align-items:flex-start")}>
                <div>
                  <div style={sx("font-weight:600")}>{l}</div>
                  <div className="t2" style={sx("font-size:13px;margin-top:2px")}>{d}</div>
                </div>
                <span className="n" style={sx(`font-size:28px;color:${c}`)}>+{pt}</span>
              </div>
              <div className="tr"><div className="fl" style={sx(`width:${pc}%;background:${c}`)} /></div>
            </div>
          ))}
        </div>
      </section>
      <section className="g" aria-label="Today's adjustment">
        <span className="lbl">Today&apos;s adjustment</span>
        <div className="card row" style={sx("align-items:flex-start")}>
          <Ic i="i-trend" s="color:var(--t2);margin-top:1px" />
          <div style={sx("font-size:14px;line-height:1.5")}>
            {T.dev ? (
              <>
                <b style={sx("font-weight:600")}>+{T.dev} kcal, mostly carbs.</b>
                <span className="t2"> {wear!.strain >= WHOOP.STRAIN_HIGH ? "High" : "Moderate"} strain today ({wear!.strain}).</span>
              </>
            ) : (
              <span className="t2">No adjustment today — strain {wear!.strain} is below the threshold, so targets stay at {fmt(T.kcal)} kcal.</span>
            )}
          </div>
        </div>
      </section>
      <button className="cta" onClick={() => A.tab("plan")}>See today&apos;s plan</button>
    </div>
  );
}
