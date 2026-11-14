"use client";
// vDining (mockup 1309–1343).
import { sx } from "@/lib/hackro/sx";
import { useHackro, profileOf } from "@/lib/hackro/store";
import { itemIcon, tagsText, NOW } from "@/lib/hackro/helpers";
import { DAYS, MEALS, VENUES, conflict, dispName, mealById, qty, type PlannerItem } from "@/lib/planner";
import { Ic } from "../Icon";

export function Dining() {
  const { S, E, A } = useHackro();
  const mid = S.dineMeal;
  const m = mealById(mid)!;
  const f = S.dineFilter === "fits" || S.dineFilter === "all" ? null : S.dineFilter;
  const fitsOn = S.dineFits !== false;
  const sts = E.menuFor(mid);
  const p = profileOf(S);
  const pass = (it: PlannerItem) => {
    if (!it.nut) return false;
    if (fitsOn && !E.fits(it)) return false;
    if (!f) return true;
    if (f === "protein") return !!it.nut && it.nut[1] >= 15;
    if (f === "vegan") return it.tags.has("vegan");
    if (f === "gf") return it.tags.has("gluten free");
    if (f === "halal") return it.tags.has("halal");
    return true;
  };
  const isOpen = m.day === NOW.day && NOW.mins >= m.start && NOW.mins < m.end;
  const count = sts.reduce((a, s) => a + s.items.filter((i) => i.nut && E.fits(i)).length, 0);
  return (
    <div className="bd">
      <header className="row sb">
        <span className="lbl">Dining · Swarthmore</span>
        <span className="row" style={sx("gap:6px;font-size:13px;color:var(--green)")}>
          <span style={sx("width:8px;height:8px;border-radius:999px;background:var(--green)")} />Breakfast until 11 AM
        </span>
      </header>
      <div className="g" style={sx("gap:8px;margin-top:-16px")}>
        <h1 className="h1">{count} items at {m.name.toLowerCase()} fit your plan</h1>
        <p className="sub">Dining Center · {DAYS[m.day].label} · {m.hours}{isOpen ? " · open now" : ""}</p>
      </div>
      <div className="g" style={sx("gap:12px;margin-top:-8px")}>
        <div className="scrollx">
          {MEALS.filter((x) => x.kind !== "snack").map((x) => (
            <button key={x.id} className={`chip ${mid === x.id ? "on" : ""}`} onClick={() => A.dineMeal(x.id)}>
              {DAYS[x.day].short} {x.name}
            </button>
          ))}
        </div>
        <div className="scrollx">
          <button className={`chip ${fitsOn ? "on" : ""}`} style={fitsOn ? undefined : sx("background:transparent;box-shadow:inset 0 0 0 1px var(--line)")}
            onClick={() => A.dineFits()} aria-pressed={fitsOn}>Fits me</button>
          {([["protein", "15g+ protein"], ["vegan", "Vegan"], ["gf", "Gluten-free"], ["halal", "Halal"]] as const).map(([k, l]) => (
            <button key={k} className={`chip ${f === k ? "on" : ""}`} style={f === k ? undefined : sx("background:transparent;box-shadow:inset 0 0 0 1px var(--line)")}
              onClick={() => A.dineFilter(k)} aria-pressed={f === k}>{l}</button>
          ))}
        </div>
      </div>
      {sts.map((s) => {
        const theme = s.items.find((i) => i.theme);
        const its = s.items.filter((i) => !i.theme && pass(i));
        if (!its.length) return null;
        return (
          <section key={s.station} className="g" aria-label={s.station}>
            <div className="row sb">
              <span className="lbl">{s.station}</span>
              {theme ? <span className="u">{theme.name}</span> : null}
            </div>
            <div className="card list" style={sx("padding:0")}>
              {its.map((it) => {
                const c = conflict(it, p);
                return (
                  <button key={it.name} className="li" onClick={() => A.open(`food:${it.name}|${mid}`)} style={c ? sx("opacity:.55") : undefined}>
                    <span className="tile"><Ic i={itemIcon(it)} /></span>
                    <span style={sx("flex:1;min-width:0")}>
                      <span style={sx("display:block;font-weight:600")}>{dispName(it)}</span>
                      <span style={sx("display:block;font-size:13px;margin-top:2px")} className={c ? "warn" : "t2"}>
                        {c ? c : (tagsText(it).diet.join(" · ") || (it.nut ? qty(it.nut[4], it.nut[5]) : ""))}
                      </span>
                    </span>
                    {it.nut ? (
                      <span style={sx("text-align:right;line-height:1.3")}>
                        <span className="n" style={sx(`display:block;font-size:18px;${it.nut[1] >= 15 ? "color:var(--lime)" : ""}`)}>{it.nut[1]}g</span>
                        <span className="u" style={sx("font-size:12px")}>{it.nut[0]} kcal</span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <section className="g" aria-label="Other locations">
        <span className="lbl">Other campus spots</span>
        <div className="card list" style={sx("padding:0")}>
          {VENUES.map((v) => (
            <div key={v.name} className="li" style={v.open ? undefined : sx("opacity:.6")}>
              <span className="tile"><Ic i={v.icon} /></span>
              <span style={sx("flex:1;min-width:0")}>
                <span style={sx("display:block;font-weight:600")}>{v.name}</span>
                <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{v.d}</span>
              </span>
              <span style={sx(`font-size:12px;text-align:right;max-width:110px;color:${v.open ? "var(--green)" : "var(--t3)"}`)}>{v.status}</span>
            </div>
          ))}
        </div>
        <p className="note" style={sx("margin:0")}>Only the Dining Center publishes itemized menus. Hours from Swarthmore Dining.</p>
      </section>
    </div>
  );
}
