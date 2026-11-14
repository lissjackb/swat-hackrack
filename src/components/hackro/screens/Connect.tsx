"use client";
// vConnect (mockup 1010–1023).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import { PERMS } from "@/lib/hackro/data";
import { Ic } from "../Icon";

export function Connect() {
  const { A } = useHackro();
  return (
    <div className="bd">
      <div className="top" style={sx("padding-top:8px")}>
        <button className="ib" onClick={() => A.go("reveal")} aria-label="Back"><Ic i="i-back" /></button>
        <span className="lbl">Connect Whoop</span>
        <span />
      </div>
      <div className="g" style={sx("gap:8px")}>
        <h1 className="h1">Let today&apos;s strain and recovery move your targets</h1>
        <p className="sub">Hackro reads Whoop every morning and adjusts calories and carbs before your first meal. You choose exactly which data it sees.</p>
      </div>
      <section className="card g" style={sx("gap:16px")} aria-label="Whoop">
        <div className="row">
          <span className="tile" style={sx("width:52px;height:52px;border-radius:12px")}><Ic i="i-band" s="width:26px;height:26px" /></span>
          <span style={sx("flex:1")}>
            <span style={sx("display:block;font:600 17px Inter,sans-serif")}>Whoop</span>
            <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Read-only · change anytime in You</span>
          </span>
        </div>
        <div className="g" style={sx("gap:10px")}>
          {PERMS.map(([k, i, l, d]) => (
            <div key={k} className="row" style={sx("font-size:14px")}>
              <Ic i={i} s="width:18px;height:18px;color:var(--t2)" />
              <span style={sx("flex:1")}>{l}</span>
              <span className="t3" style={sx("font-size:12px")}>{d}</span>
            </div>
          ))}
        </div>
        <button className="cta inr" onClick={() => A.auth("whoop")}>Choose data and connect</button>
      </section>
      <p className="note" style={sx("margin:0")}>Demo connection: shows sample data, no account is linked.</p>
      <button className="ghost" onClick={() => A.enter()} style={sx("margin-top:auto")}>Not now</button>
    </div>
  );
}
