"use client";
// vYou (mockup 1479–1503).
import { sx } from "@/lib/hackro/sx";
import { useHackro, profileOf } from "@/lib/hackro/store";
import { neverLabel } from "@/lib/hackro/helpers";
import { DEVICES, PERMS } from "@/lib/hackro/data";
import { GOALS, allergiesOf, dietOf, fmt } from "@/lib/planner";
import { Ic } from "../Icon";

export function You() {
  const { S, E, A } = useHackro();
  const T = E.targets();
  const p = S.p;
  const pp = profileOf(S);
  const goal = p.goal ?? "maintain";
  const diet = dietOf(pp);
  const allergies = allergiesOf(pp);
  const permCount = PERMS.filter((x) => S.perms[x[0]]).length;
  return (
    <div className="bd">
      <header className="row" style={sx("gap:16px;margin-top:12px")}>
        <div style={sx("width:64px;height:64px;border-radius:999px;background:var(--s2);display:flex;align-items:center;justify-content:center;font:600 26px Inter,sans-serif;flex:none")}>
          {(p.name || "?")[0].toUpperCase()}
        </div>
        <div style={sx("flex:1")}>
          <h1 className="h1" style={sx("font-size:32px")}>{p.name || "You"}</h1>
          <div className="t2" style={sx("font-size:14px;margin-top:4px")}>
            {GOALS[goal].label} · <span className="n" style={sx("font-size:16px;color:var(--tx)")}>{p.lb}</span> lb · Swarthmore
          </div>
        </div>
        <button onClick={() => A.open("goals")} style={sx("height:44px;color:var(--garnet-t);font:600 14px Inter,sans-serif")}>Edit</button>
      </header>
      <section className="g" aria-label="Targets">
        <span className="lbl">Daily targets</span>
        <div className="card" style={sx("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px")}>
          {([["kcal", fmt(T.kcal)], ["Protein", T.p + "g"], ["Carbs", T.c + "g"], ["Fat", T.f + "g"]] as const).map(([l, v], i) => (
            <div key={l}>
              <div className="n" style={sx(`font-size:24px;${i === 1 ? "color:var(--lime)" : ""}`)}>{v}</div>
              <div className="lbl" style={sx("margin-top:8px;font-size:12px")}>{l}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="card list" style={sx("padding:0")} aria-label="Settings">
        <button className="li" onClick={() => A.open("goals")}>
          <Ic i="i-sliders" s="color:var(--t2)" />
          <span style={sx("flex:1")}>Goals, diet &amp; allergies</span>
          <span className="t2" style={sx("font-size:14px")}>
            {diet === "omnivore" ? "No restrictions" : diet[0].toUpperCase() + diet.slice(1)}
            {allergies.length ? ` · ${allergies.length} allerg${allergies.length > 1 ? "ies" : "y"}` : ""}
          </span>
          <Ic i="i-chev" s="width:18px;height:18px;color:var(--t3)" />
        </button>
        <div className="li">
          <Ic i="i-info" s="color:var(--t2)" />
          <span style={sx("flex:1")}>Data sources</span>
          <span className="t2" style={sx("font-size:13px;text-align:right")}>Menus: The Dash, Nov 14–15<br />Nutrition: Hackro estimates</span>
        </div>
      </section>
      {(p.never || []).length ? (
        <section className="g" aria-label="Never again">
          <span className="lbl">Never again</span>
          <div className="card list" style={sx("padding:0")}>
            {p.never.map((n) => (
              <div key={n} className="li">
                <Ic i="i-ban" s="color:var(--t3)" />
                <span style={sx("flex:1;min-width:0")}>{neverLabel(E, n)}</span>
                <button className="chip" style={sx("background:var(--s2)")} onClick={() => A.unnever(n)}>Bring back</button>
              </div>
            ))}
          </div>
          <p className="note" style={sx("margin:0")}>These never show up in your plan. Swapped automatically.</p>
        </section>
      ) : null}
      <section className="g" aria-label="Wearable">
        <span className="lbl">Wearable</span>
        <div className="card list" style={sx("padding:0")}>
          {DEVICES.map((x) => (
            <div key={x.id} className="li">
              <span className="tile"><Ic i={x.icon} /></span>
              <span style={sx("flex:1;min-width:0")}>
                <span style={sx("display:block;font-weight:600")}>{x.name}</span>
                {x.id === S.device ? (
                  <span style={sx("display:block;font-size:13px;margin-top:2px;color:var(--green)")}>Connected · sharing {permCount} of {PERMS.length}</span>
                ) : (
                  <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{S.whoop === "no" ? "Got one later? Connect it here" : "Not connected"}</span>
                )}
              </span>
              <button className="chip" style={sx("background:var(--s2)")}
                onClick={() => (x.id === S.device ? A.auth(x.id) : A.go("connect"))}>
                {x.id === S.device ? "Manage data" : "Connect"}
              </button>
            </div>
          ))}
          {S.device ? (
            <div style={sx("padding:4px 16px 14px;display:flex;flex-wrap:wrap;gap:6px")}>
              {PERMS.map(([k, , l]) => (
                <span key={k} style={sx(`font-size:12px;padding:4px 10px;border-radius:999px;background:var(--s2);color:${S.perms[k] ? "var(--tx)" : "var(--t3)"};${S.perms[k] ? "" : "text-decoration:line-through"}`)}>
                  {l.split(" and ")[0]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <button className="ghost fill" onClick={() => A.reset()}><Ic i="i-refresh" s="width:18px;height:18px" />Restart the demo</button>
      <button className="ghost" onClick={() => A.logout()} style={sx("color:var(--t2)")}><Ic i="i-logout" s="width:18px;height:18px" />Sign out</button>
    </div>
  );
}
