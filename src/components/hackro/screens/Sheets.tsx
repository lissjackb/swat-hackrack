"use client";
// The sheet layer (mockup 1025–1118 + render() 1541): auth, sync, synced,
// iswap, log (quick/menu/custom with live USDA lookup), flex, reward.
import { useEffect, useRef } from "react";
import { sx } from "@/lib/hackro/sx";
import { useHackro, profileOf } from "@/lib/hackro/store";
import { itemIcon, parseQty, swapCands, fuelBand } from "@/lib/hackro/helpers";
import { DEVICES, PERMS, QUICK, REWARDS } from "@/lib/hackro/data";
import {
  allergenState, allergiesOf, dispName, fmt, guessAllergens,
  mealById, otherOf, partText, qty, userHits, WHOOP,
} from "@/lib/planner";
import { Ic } from "../Icon";
import { ABadge, NdBadge, Spinner } from "../ui";

export function SheetLayer() {
  const { S, A } = useHackro();
  const sheet = S.sheet;
  // Escape closes any sheet except sync (mockup 1674).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && S.sheet && S.sheet.type !== "sync") A.closeSheet();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  if (!sheet) return null;
  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget && sheet.type !== "sync") A.closeSheet(); }}>
      <div className="sheet" role="dialog" aria-modal="true">
        {sheet.type === "auth" ? <SheetAuth id={sheet.id!} />
          : sheet.type === "sync" ? <SheetSync id={sheet.id!} />
          : sheet.type === "synced" ? <SheetSynced id={sheet.id!} />
          : sheet.type === "iswap" ? <SheetISwap mealId={sheet.meal!} k={sheet.key!} />
          : sheet.type === "log" ? <SheetLog />
          : sheet.type === "flex" ? <SheetFlex />
          : sheet.type === "reward" ? <SheetReward />
          : null}
      </div>
    </div>
  );
}

function SheetAuth({ id }: { id: string }) {
  const { S, A } = useHackro();
  const d = DEVICES.find((x) => x.id === id)!;
  const pm = S.sheet?.perms || {};
  const n = PERMS.filter((x) => pm[x[0]]).length;
  const editing = S.device === id;
  return (
    <>
      <div className="row sb">
        <span className="tile" style={sx("width:52px;height:52px;border-radius:16px;background:var(--s2)")}><Ic i={d.icon} s="width:26px;height:26px" /></span>
        <button className="ib" style={sx("background:var(--s2)")} onClick={() => A.closeSheet()} aria-label="Close"><Ic i="i-x" /></button>
      </div>
      <div className="g" style={sx("gap:8px")}>
        <h2 className="h1" style={sx("font-size:28px")}>Choose what Hackro reads from {d.name}</h2>
        <p className="sub">Read-only. Turn anything off and the features that use it hide.</p>
      </div>
      <div className="in" style={sx("padding:0 14px")}>
        <div className="list">
          {PERMS.map(([k, i, l, desc]) => (
            <button key={k} className="row" onClick={() => A.perm(k)} role="switch" aria-checked={!!pm[k]} style={sx("padding:12px 0;width:100%;text-align:left")}>
              <Ic i={i} s="color:var(--t2)" />
              <span style={sx("flex:1;min-width:0")}>
                <span style={sx("display:block")}>{l}</span>
                <span className="t3" style={sx("display:block;font-size:12px;margin-top:2px")}>{desc}</span>
              </span>
              <span className={`tog ${pm[k] ? "on" : ""}`} />
            </button>
          ))}
        </div>
      </div>
      <p className="note" style={sx(`margin:0;min-height:36px;visibility:${!pm.recovery ? "visible" : "hidden"}`)}>
        With recovery off there&apos;s no Fuel Score, and targets won&apos;t adjust for hard days.
      </p>
      <div className="g" style={sx("gap:4px")}>
        <button className="cta" onClick={() => A.allow(id)} disabled={!n}>
          {n ? (editing ? `Save · sharing ${n} of ${PERMS.length}` : `Allow ${n} and sync`) : "Pick at least one"}
        </button>
        {editing
          ? <button className="ghost" onClick={() => A.disconnect()} style={sx("color:var(--garnet-t)")}>Disconnect {d.name}</button>
          : <button className="ghost" onClick={() => A.closeSheet()}>Cancel</button>}
      </div>
    </>
  );
}

function SheetSync({ id }: { id: string }) {
  const { S } = useHackro();
  const d = DEVICES.find((x) => x.id === id)!;
  const names = PERMS.filter((x) => S.sheet?.perms && S.sheet.perms[x[0]]).map((x) => x[2].split(" ")[0].toLowerCase()).join(", ");
  return (
    <div className="g" style={sx("gap:20px;align-items:center;text-align:center;padding:24px 0")} role="status" aria-busy="true">
      <Spinner size={64} stroke="#B8F135" track="#2C3036" width={2} />
      <div className="g" style={sx("gap:6px")}>
        <h2 className="h1" style={sx("font-size:28px")}>Syncing {d.name}</h2>
        <p className="sub">Pulling the last 7 days of {names}…</p>
      </div>
    </div>
  );
}

function SheetSynced({ id }: { id: string }) {
  const { S, E, A } = useHackro();
  const d = DEVICES.find((x) => x.id === id)!;
  const T = E.targets();
  const wear = S.wear;
  const hasRec = !!S.device && !!S.perms.recovery && !!wear;
  const f = hasRec ? wear!.recovery : null;
  const permCount = PERMS.filter((x) => S.perms[x[0]]).length;
  const tiles = [
    hasRec ? ([`${wear!.recovery}%`, "Recovery", "var(--lime)"] as const) : null,
    hasRec ? ([String(wear!.strain), "Strain today", "var(--blue)"] as const) : null,
  ].filter(Boolean) as (readonly [string, string, string])[];
  return (
    <>
      <div className="g" style={sx("gap:8px")}>
        <span className="lbl" style={sx("color:var(--green)")}>{d.name} connected · {permCount} of {PERMS.length} data types</span>
        <h2 className="h1" style={sx("font-size:30px")}>
          {f != null
            ? `Fuel Score ${f}: ${fuelBand(wear!.recovery) === "Optimal" ? "you're recovered and cleared to build" : "synced from this morning"}`
            : `Connected. Your targets stay steady for now`}
        </h2>
      </div>
      {tiles.length ? (
        <div style={sx(`display:grid;grid-template-columns:repeat(${tiles.length},minmax(0,1fr));gap:8px;text-align:center`)}>
          {tiles.map(([v, l, c]) => (
            <div key={l} className="in" style={sx("padding:14px 6px")}>
              <div className="n" style={sx(`font-size:26px;color:${c}`)}>{v}</div>
              <div className="lbl" style={sx("margin-top:8px")}>{l}</div>
            </div>
          ))}
        </div>
      ) : null}
      {hasRec ? (
        <div className="in row" style={sx("padding:14px;align-items:flex-start")}>
          <Ic i="i-trend" s="color:var(--lime);margin-top:1px" />
          <div style={sx("font-size:14px;line-height:1.5")}>
            <b style={sx("font-weight:600")}>Today&apos;s target is now {fmt(T.kcal)} kcal.</b>
            <span className="t2">
              {T.dev
                ? ` ${wear!.strain >= WHOOP.STRAIN_HIGH ? "High" : "Moderate"} strain today (${wear!.strain}), so +${T.dev} kcal, mostly carbs.`
                : ` Strain ${wear!.strain} is below the threshold, so no calorie change today.`}
            </span>
          </div>
        </div>
      ) : (
        <div className="in row" style={sx("padding:14px;align-items:flex-start")}>
          <Ic i="i-info" s="color:var(--t2);margin-top:1px" />
          <div style={sx("font-size:14px;line-height:1.5")} className="t2">
            Strain and recovery are off, so targets stay at {fmt(T.kcal)} kcal. Turn them on anytime in You.
          </div>
        </div>
      )}
      <button className="cta" onClick={() => A.enter()}>Explore Hackro</button>
    </>
  );
}

function SheetISwap({ mealId, k }: { mealId: string; k: string }) {
  const { S, E, A } = useHackro();
  const p = profileOf(S);
  const { pp, k0, p0, out, x } = swapCands(E, p, mealId, k);
  if (!pp) return null;
  return (
    <>
      <div className="row sb" style={sx("align-items:flex-start")}>
        <div className="g" style={sx("gap:8px")}>
          <span className="lbl">Swap one item · {x.m.name}</span>
          <h2 className="h1" style={sx("font-size:28px")}>Instead of {pp.it.name.toLowerCase()}</h2>
          <p className="sub">{partText(pp)} · {fmt(k0)} kcal · {Math.round(p0)}g protein</p>
        </div>
        <button className="ib" style={sx("background:var(--s2)")} onClick={() => A.closeSheet()} aria-label="Close"><Ic i="i-x" /></button>
      </div>
      {out.length ? (
        <div className="in list">
          {out.map((c) => {
            const dp = Math.round(c.p - p0), dk = Math.round(c.k - k0);
            return (
              <button key={c.it.name} className="li" onClick={() => A.iswapGo(mealId, k, c.it.name, c.m)}>
                <span className="tile" style={sx("background:var(--s1)")}><Ic i={itemIcon(c.it)} /></span>
                <span style={sx("flex:1;min-width:0")}>
                  <span style={sx("display:block;font-weight:600")}>{dispName(c.it)}</span>
                  <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>
                    {qty(c.it.nut![4] * c.m, c.it.nut![5])} · {E.stationsOf(c.it.name, mealId)[0]}
                  </span>
                </span>
                <span style={sx("text-align:right;line-height:1.35")}>
                  <span className="n" style={sx(`display:block;font-size:17px;color:${dp >= 0 ? "var(--lime)" : "var(--t2)"}`)}>{dp >= 0 ? "+" : ""}{dp}g</span>
                  <span className="u" style={sx("font-size:12px")}>{dk >= 0 ? "+" : ""}{dk} kcal</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="sub">Nothing else in that category at {x.m.name.toLowerCase()} fits your diet. Try a whole new meal instead.</p>
      )}
      {pp.from ? <button className="ghost" onClick={() => A.iswapReset(mealId, k)}>Go back to {k.toLowerCase()}</button> : null}
      <button className="ghost fill" onClick={() => A.never(pp.it.name, mealId)} style={sx("color:var(--garnet-t)")}>
        <Ic i="i-ban" s="width:18px;height:18px" />Never again
      </button>
      <p className="note" style={sx("margin:0")}>Portions are resized to keep calories and protein close. Your daily targets don&apos;t change. Never again removes it from every future plan.</p>
    </>
  );
}

function SheetLog() {
  const { S, E, A } = useHackro();
  const sheet = S.sheet!;
  const t = sheet.tab || "quick";
  const c = sheet.c || {};
  const p = profileOf(S);
  const nameRef = useRef(c.name);
  useEffect(() => { nameRef.current = c.name; }, [c.name]);

  // Custom-food macros from USDA FoodData Central via /api/nutrition
  // (per 100g × amount), debounced 500ms. Nothing hardcoded (mockup 341–366).
  useEffect(() => {
    if (t !== "custom") return;
    const name = c.name?.trim();
    if (!name || c.manual) return;
    const timer = setTimeout(() => {
      A.setCustom({ loading: true, searched: false });
      const query = parseQty(name).q || name;
      fetch(`/api/nutrition?name=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((r: { nutrition: { calories: number; protein: number; carbs: number; fat: number; match?: string } | null }) => {
          if (nameRef.current?.trim() !== name) return; // stale
          const nu = r && r.nutrition;
          if (nu && nu.calories > 0) {
            const per100 = { k: nu.calories, p: nu.protein, c: nu.carbs, f: nu.fat };
            const g = (+(c.grams ?? 100) || 100) / 100;
            A.setCustom({
              per100, match: nu.match || query, manual: false, loading: false, searched: true,
              k: Math.round(per100.k * g), p: Math.round(per100.p * g), c: Math.round(per100.c * g), f: Math.round(per100.f * g),
            });
          } else {
            A.setCustom({ per100: null, match: "", loading: false, searched: true });
          }
        })
        .catch(() => { if (nameRef.current?.trim() === name) A.setCustom({ per100: null, match: "", loading: false, searched: true }); });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.name, t]);

  if (sheet.confirm) {
    const h = sheet.confirm.hits;
    return (
      <>
        <div className="g" style={sx("gap:16px;padding-top:8px")}>
          <span style={sx("width:56px;height:56px;border-radius:16px;background:rgba(255,90,90,.12);color:var(--red);display:flex;align-items:center;justify-content:center")}>
            <Ic i="i-alert" s="width:28px;height:28px" />
          </span>
          <h2 className="h1" style={sx("font-size:30px")}>This contains {h.join(", ")}. Log anyway?</h2>
          <p className="sub">Logging is fine if you already ate it. Hackro will never recommend it. Allergens for foods outside the Dining Center are Hackro estimates from the name.</p>
        </div>
        <div className="g" style={sx("gap:4px")}>
          <button className="cta" onClick={() => A.logConfirm()}>Log anyway</button>
          <button className="ghost" onClick={() => A.logCancel()}>Cancel</button>
        </div>
      </>
    );
  }

  const q = (sheet.q || "").toLowerCase().trim();
  const seen = new Map<string, { it: NonNullable<ReturnType<typeof E.findItem>>; id: string }>();
  for (const id of ["sat-b", "sat-l", "sat-d"]) {
    for (const it of E.itemsFor(id)) if (!seen.has(it.name)) seen.set(it.name, { it, id });
  }
  const list = [...seen.values()].filter((o) => !q || o.it.name.toLowerCase().includes(q)).slice(0, 40);

  return (
    <>
      <div className="row sb" style={sx("align-items:flex-start")}>
        <div className="g" style={sx("gap:8px")}>
          <span className="lbl">Outside the plan</span>
          <h2 className="h1" style={sx("font-size:28px")}>What else did you eat?</h2>
        </div>
        <button className="ib" style={sx("background:var(--s2)")} onClick={() => A.closeSheet()} aria-label="Close"><Ic i="i-x" /></button>
      </div>
      <div className="seg" style={sx("grid-template-columns:repeat(3,1fr);background:var(--s2)")}>
        {([["quick", "Quick add"], ["menu", "Dining Center"], ["custom", "Custom"]] as const).map(([k, l]) => (
          <button key={k} className={t === k ? "on" : ""} style={t === k ? sx("background:#2C3036") : undefined} onClick={() => A.logTab(k)}>{l}</button>
        ))}
      </div>
      {t === "quick" ? (
        <div className="in list">
          {QUICK.map(([n, k, pr], i) => (
            <button key={n} className="li" onClick={() => A.logQuick(i)}>
              <span style={sx("flex:1;min-width:0")}>
                <span style={sx("display:block;font-weight:600")}>{n}</span>
                <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{k} kcal · {pr}g protein</span>
                <ABadge hits={userHits(guessAllergens(n), n, p)} />
              </span>
              <Ic i="i-plus" s="color:var(--t2)" />
            </button>
          ))}
        </div>
      ) : null}
      {t === "menu" ? (
        <>
          <input className="inp" style={sx("background:var(--s2)")} type="search" placeholder="Search Saturday's menu"
            aria-label="Search Saturday's menu" value={sheet.q || ""} onChange={(e) => A.setSheetQ(e.target.value)} />
          <div className="in list" style={sx("max-height:44vh;overflow:auto")}>
            {list.length ? list.map((o) => {
              const n = o.it.nut!;
              const st = allergenState(o.it);
              const h = userHits(st.list, o.it.name, p);
              return (
                <button key={o.it.name} className="li" onClick={() => A.logMenu(o.it.name, o.id)}>
                  <span className="tile" style={sx("background:var(--s1)")}><Ic i={itemIcon(o.it)} /></span>
                  <span style={sx("flex:1;min-width:0")}>
                    <span style={sx("display:block;font-weight:600")}>{dispName(o.it)}</span>
                    <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{qty(n[4], n[5])} · {n[0]} kcal · {n[1]}g protein</span>
                    {h.length ? <ABadge hits={h} /> : st.state === "nodata" && (allergiesOf(p).length || otherOf(p)) ? <NdBadge /> : null}
                  </span>
                  <Ic i="i-plus" s="color:var(--t2)" />
                </button>
              );
            }) : <p className="note" style={sx("padding:16px;margin:0")}>Nothing on Saturday&apos;s menu matches. Try Custom.</p>}
          </div>
        </>
      ) : null}
      {t === "custom" ? (
        <div className="g" style={sx("gap:12px")}>
          <label className="field">
            <span>What did you eat?</span>
            <input className="inp" style={sx("background:var(--s2)")} value={c.name || ""} placeholder="e.g. 2 eggs, Wawa hoagie, iced latte"
              autoComplete="off" onChange={(e) => {
                const name = e.target.value;
                A.setCustom({ name, manual: false, grams: c.grams || 100, ...(name.trim() ? {} : { per100: null, match: "", searched: false, loading: false }) });
              }} />
          </label>
          <div>
            {c.name && c.loading ? (
              <div className="row" style={sx("gap:8px;color:var(--t2);font-size:13px")}>
                <Ic i="i-refresh" s="width:16px;height:16px" />
                <span>Looking up &ldquo;{parseQty(c.name).q || c.name}&rdquo; in USDA FoodData Central…</span>
              </div>
            ) : c.name && c.per100 && c.match ? (
              <div className="in row" style={sx("padding:12px 14px;gap:10px;align-items:flex-start")}>
                <Ic i="i-check" s="color:var(--green);margin-top:1px" />
                <div style={sx("font-size:13px;line-height:1.4")}>
                  <span style={sx("display:block;font-weight:600")}>USDA · {c.match}</span>
                  <span className="t2">{c.per100.k} kcal · {c.per100.p}g protein per 100g</span>
                </div>
              </div>
            ) : c.name && c.searched ? (
              <p className="note" style={sx("margin:0")}>No USDA match — enter the numbers from the label below.</p>
            ) : null}
          </div>
          <div className="row sb">
            <span className="t2">Amount</span>
            <div className="row" style={sx("gap:8px")}>
              <button className="ib" style={sx("width:36px;height:36px;background:var(--s2)")} onClick={() => A.cGram(-25)} aria-label="Less"><Ic i="i-minus" s="width:16px;height:16px" /></button>
              <span className="n" style={sx("font-size:20px;min-width:52px;text-align:center")}>{+(c.grams ?? 100) || 100} g</span>
              <button className="ib" style={sx("width:36px;height:36px;background:var(--s2)")} onClick={() => A.cGram(25)} aria-label="More"><Ic i="i-plus" s="width:16px;height:16px" /></button>
            </div>
          </div>
          <div style={sx("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px")}>
            {([["k", "kcal"], ["p", "Protein"], ["c", "Carbs"], ["f", "Fat"]] as const).map(([k, l]) => (
              <label key={k} className="field">
                <span>{l}</span>
                <input className="inp" style={sx("background:var(--s2);padding:0 10px")} type="number" inputMode="numeric" min={0}
                  value={c[k] ?? ""} placeholder="0" onChange={(e) => A.setCustom({ [k]: e.target.value, manual: true })} />
              </label>
            ))}
          </div>
          <p className="note" style={sx("margin:0")}>Looked up from USDA FoodData Central (per 100g × amount). Edit any number if you know the label.</p>
          <button className="cta" onClick={() => A.logCustom()} disabled={!(c.name && +(c.k ?? 0))}>Add to today</button>
        </div>
      ) : null}
      <p className="note" style={sx("margin:0")}>Counts toward today&apos;s goals and streak. Quick-add values are Hackro estimates.</p>
    </>
  );
}

function SheetFlex() {
  const { S, E, A } = useHackro();
  const m = mealById(S.sheet!.meal!)!;
  const x = E.plan("sat").find((y) => y.m.id === m.id)!;
  const f = S.sheet!.f || {};
  return (
    <>
      <div className="row sb" style={sx("align-items:flex-start")}>
        <div className="g" style={sx("gap:8px")}>
          <span className="lbl">Flex meal · {m.name}</span>
          <h2 className="h1" style={sx("font-size:28px")}>Eating {m.name.toLowerCase()} somewhere else?</h2>
          <p className="sub">Log a rough guess and the rest of today rebalances around it. Flex meals never break your streak.</p>
        </div>
        <button className="ib" style={sx("background:var(--s2)")} onClick={() => A.closeSheet()} aria-label="Close"><Ic i="i-x" /></button>
      </div>
      <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:8px")}>
        <label className="field">
          <span>About how many kcal</span>
          <input className="inp" style={sx("background:var(--s2)")} type="number" inputMode="numeric" min={0}
            value={f.k ?? ""} placeholder={fmt(x.tot.k)} onChange={(e) => A.setFlexField("k", e.target.value)} />
        </label>
        <label className="field">
          <span>Protein (g)</span>
          <input className="inp" style={sx("background:var(--s2)")} type="number" inputMode="numeric" min={0}
            value={f.p ?? ""} placeholder={String(Math.round(x.tot.p))} onChange={(e) => A.setFlexField("p", e.target.value)} />
        </label>
      </div>
      <div className="g" style={sx("gap:4px")}>
        <button className="cta" onClick={() => A.flexSave()}>Save flex meal</button>
        <button className="ghost" onClick={() => A.flexSkip()}>Skip the numbers (assume what was planned)</button>
      </div>
    </>
  );
}

function SheetReward() {
  const { A } = useHackro();
  const r = REWARDS[0];
  const nx = REWARDS[1];
  return (
    <>
      <div className="g" style={sx("gap:20px;align-items:center;text-align:center;padding-top:8px")}>
        <span style={sx("width:112px;height:112px;border-radius:999px;background:rgba(255,148,50,.16);color:var(--orange);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px rgba(255,148,50,.06)")}>
          <Ic i={r[3]} s="width:52px;height:52px;stroke-width:1.5" />
        </span>
        <div className="g" style={sx("gap:8px")}>
          <span className="lbl" style={sx("color:var(--orange)")}>Reward unlocked · 1 day streak</span>
          <h2 className="h1" style={sx("font-size:36px")}>{r[1]}</h2>
          <p className="sub">You hit protein and landed calories in range. {nx[1]} unlocks in {nx[0] - 1} more days.</p>
        </div>
      </div>
      <div className="g" style={sx("gap:4px")}>
        <button className="cta" onClick={() => A.seeRewards()}>See your rewards</button>
        <button className="ghost" onClick={() => A.closeSheet()}>Keep going</button>
      </div>
    </>
  );
}
