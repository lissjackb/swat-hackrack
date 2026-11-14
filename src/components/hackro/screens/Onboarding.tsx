"use client";
// vOnboard + obValid/obErrors/obBody/stepper (mockup 861–935), with ObBody
// reused by the Goals editor (vGoals, 1505) via `compact`.
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";
import type { HackroDraft, HackroProfile } from "@/lib/hackro/state";
import { ALLERGENS, GOALS, allergiesOf, dietOf, otherOf, type PlannerProfile } from "@/lib/planner";
import { Ic } from "../Icon";
import { NumField, ObHead } from "../ui";

export const OB_STEPS = 4;
export const OBKEYS = ["basics", "avoid", "goal", "train"] as const;
export type ObKey = (typeof OBKEYS)[number];

const asPlanner = (p: HackroProfile | HackroDraft) => p as unknown as PlannerProfile;

export function obValid(key: ObKey, p: HackroProfile): boolean {
  const num = (v: unknown, lo: number, hi: number) =>
    v !== "" && v !== null && v !== undefined && !isNaN(+(v as number)) && +(v as number) >= lo && +(v as number) <= hi;
  if (key === "basics") return !!String(p.name || "").trim() && !!p.sex && num(p.age, 16, 30) && num(p.lb, 80, 400) && num(p.ft, 4, 7) && num(p.inch, 0, 11);
  if (key === "goal") return !!p.goal;
  if (key === "train") return p.days !== null && p.days !== undefined;
  return !!p.dietPicked && !!p.allergySet && (!p.otherOn || !!otherOf(asPlanner(p)).trim());
}

export function obErrors(key: ObKey, p: HackroProfile, all: boolean): string[] {
  const out: string[] = [];
  const has = (v: unknown) => v !== "" && v !== null && v !== undefined;
  const bad = (v: unknown, lo: number, hi: number) => isNaN(+(v as number)) || +(v as number) < lo || +(v as number) > hi;
  if (key === "basics") {
    if (all && !String(p.name || "").trim()) out.push("Add your first name.");
    if (all && !p.sex) out.push("Pick male or female for the energy math.");
    if (has(p.age) ? bad(p.age, 16, 30) : all) out.push("Age must be 16–30.");
    if (has(p.lb) ? bad(p.lb, 80, 400) : all) out.push("Weight must be 80–400 lb.");
    if (has(p.ft) ? bad(p.ft, 4, 7) : all) out.push("Height must be 4–7 ft.");
    if (has(p.inch) ? bad(p.inch, 0, 11) : all) out.push("Inches must be 0–11.");
  } else if (key === "avoid") {
    if (all && !p.dietPicked) out.push('Pick a diet option. "Nothing" is fine.');
    if (all && !p.allergySet) out.push('Choose "No allergies" or pick yours.');
    if (p.otherOn && !otherOf(asPlanner(p)).trim() && all) out.push('Type your other allergy, or turn "Other" off.');
  } else if (key === "goal") {
    if (all && !p.goal) out.push("Pick a goal.");
  } else if (key === "train") {
    if (all && (p.days === null || p.days === undefined)) out.push("Pick how many days you train.");
  }
  return out;
}

export function ErrBox({ step, p, tried }: { step: ObKey; p: HackroProfile; tried: boolean }) {
  const e = obErrors(step, p, tried);
  if (!e.length) return null;
  return (
    <div className="g" style={sx("gap:4px")} role="alert">
      {e.map((m) => (
        <div key={m} className="row" style={sx("gap:6px;font-size:14px;color:var(--garnet-t)")}>
          <Ic i="i-alert" s="width:14px;height:14px" />{m}
        </div>
      ))}
    </div>
  );
}

const HEADS: Record<ObKey, [string, string]> = {
  basics: ["First, the basics", "We use these for your energy math. They never leave this browser."],
  goal: ["What are you training for?", "This sets your calorie and protein targets."],
  train: ["How hard do you train?", "Training days set how much energy you burn in a typical week."],
  avoid: ["Anything we should avoid?", "Allergies are hard rules. We use the Dining Center's own labels, and anything without allergen data is left out of your plan."],
};

/** One onboarding step's body. `compact` renders the Goals-editor variant
 * (header collapsed to a .lbl span, as vGoals' regex does). */
export function ObBody({ step, p, compact }: { step: ObKey; p: HackroProfile | HackroDraft; compact?: boolean }) {
  const { A } = useHackro();
  const head = compact
    ? <span className="lbl">{HEADS[step][0]}</span>
    : <ObHead t={HEADS[step][0]} sub={HEADS[step][1]} />;

  if (step === "basics") {
    return (
      <>
        {head}
        <div className="g" style={sx("gap:20px")}>
          <label className="field">
            <span>First name</span>
            <input className="inp" value={p.name} autoComplete="given-name" placeholder="What should we call you?"
              onChange={(e) => A.field("name", e.target.value)} />
          </label>
          <div className="field">
            <span>Campus</span>
            <div className="row" style={sx("height:52px;border-radius:16px;background:var(--s1);padding:0 16px")}>
              <span style={sx("flex:1;font-weight:500")}>Swarthmore College</span>
              <span className="u">Dining Center menus</span>
            </div>
          </div>
          <div className="field">
            <span>Sex for energy math</span>
            <div className="seg" style={sx("grid-template-columns:1fr 1fr")}>
              {([["male", "Male"], ["female", "Female"]] as const).map(([v, l]) => (
                <button key={v} type="button" className={p.sex === v ? "on" : ""} onClick={() => A.set("sex", v)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:12px")}>
            <NumField k="age" v={p.age} unit="years" ph="Age" label="Age" onChange={(k, v) => A.field(k, v, true)} />
            <NumField k="lb" v={p.lb} unit="lb" ph="Weight" label="Weight" onChange={(k, v) => A.field(k, v, true)} />
          </div>
          <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:12px")}>
            <NumField k="ft" v={p.ft} unit="ft" ph="Feet" label="Height" onChange={(k, v) => A.field(k, v, true)} />
            <NumField k="inch" v={p.inch} unit="in" ph="Inches" label={" "} onChange={(k, v) => A.field(k, v, true)} />
          </div>
        </div>
      </>
    );
  }
  if (step === "goal") {
    return (
      <>
        {head}
        <div className="g" style={sx("gap:8px")}>
          {Object.entries(GOALS).map(([k, g]) => (
            <button key={k} type="button" className={`opt ${p.goal === k ? "on" : ""}`} onClick={() => A.set("goal", k)} aria-pressed={p.goal === k}>
              <span className="radio" />
              <span style={sx("flex:1")}>
                <span style={sx("display:block;font:600 16px Inter,sans-serif")}>{g.label}</span>
                <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>{g.d}</span>
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }
  if (step === "train") {
    const sports = Array.isArray(p.sport) ? p.sport : p.sport ? [p.sport] : [];
    return (
      <>
        {head}
        <div className="g" style={sx("gap:20px")}>
          <div className="field">
            <span>Training days per week</span>
            <div className="seg" style={sx("grid-template-columns:repeat(8,minmax(0,1fr))")}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button key={d} type="button" className={p.days === d ? "on" : ""} onClick={() => A.set("days", d)}>{d}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Training types · pick all that apply</span>
            <div className="chips">
              {["Lifting", "Varsity sport", "Club sport", "Running", "Mixed", "Mostly walking"].map((s) => {
                const on = sports.includes(s);
                return (
                  <button key={s} type="button" className={`chip ${on ? "on" : ""}`} onClick={() => A.sport(s)} aria-pressed={on}>{s}</button>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }
  // avoid
  const pp = asPlanner(p);
  const diet = dietOf(pp);
  const allergies = allergiesOf(pp);
  return (
    <>
      {head}
      <div className="g" style={sx("gap:20px")}>
        <div className="field">
          <span>Diet restrictions</span>
          <div className="chips">
            {([["omnivore", "Nothing"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["pescatarian", "Pescatarian"]] as const).map(([v, l]) => (
              <button key={v} type="button" className={`chip ${p.dietPicked && diet === v ? "on" : ""}`} onClick={() => A.setDiet(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Allergies</span>
          <div className="chips">
            <button type="button" className={`chip ${p.allergySet && !allergies.length && !p.otherOn ? "on" : ""}`}
              onClick={() => A.noAllergy()} aria-pressed={p.allergySet && !allergies.length && !p.otherOn}>No allergies</button>
            {ALLERGENS.map(([v, l]) => (
              <button key={v} type="button" className={`chip ${allergies.includes(v) ? "on" : ""}`} onClick={() => A.allergy(v)} aria-pressed={allergies.includes(v)}>{l}</button>
            ))}
            <button type="button" className={`chip ${p.otherOn ? "on" : ""}`} onClick={() => A.otherAllergy()} aria-pressed={!!p.otherOn}>Other (type it)</button>
          </div>
          {p.otherOn ? (
            <>
              <input className="inp" value={otherOf(pp)} placeholder="e.g. mushroom, coconut" aria-label="Other allergy"
                style={sx("margin-top:4px")} onChange={(e) => A.otherInput(e.target.value)} />
              <span className="note" style={sx("text-transform:none;letter-spacing:0;font:400 12px Inter,sans-serif")}>
                Dining Services doesn&apos;t label this one, so we match it against dish names and skip anything unlabeled. Always confirm with staff.
              </span>
            </>
          ) : null}
        </div>
        <button type="button" className="card row" onClick={() => A.toggle("halal")} style={sx("text-align:left")}>
          <span style={sx("flex:1")}>
            <span style={sx("display:block;font-weight:600")}>Halal only</span>
            <span className="t2" style={sx("display:block;font-size:13px;margin-top:2px")}>Only meat the Dining Center labels halal</span>
          </span>
          <span className={`tog ${p.halal ? "on" : ""}`} role="switch" aria-checked={p.halal} />
        </button>
      </div>
    </>
  );
}

export function Onboarding() {
  const { S, A } = useHackro();
  const st = S.step;
  const key = OBKEYS[st];
  return (
    <div className="bd" style={sx("gap:28px")}>
      <div className="g" style={sx("gap:16px")}>
        <div className="top">
          {st > 0 ? <button className="ib" onClick={() => A.obBack()} aria-label="Back"><Ic i="i-back" /></button> : <span />}
          <span className="lbl">Step {st + 1} of {OB_STEPS}</span>
          <span />
        </div>
        <div className="prog" style={sx(`grid-template-columns:repeat(${OB_STEPS},1fr)`)}>
          {Array.from({ length: OB_STEPS }, (_, i) => <span key={i} className={i <= st ? "on" : ""} />)}
        </div>
      </div>
      <div className="g fadein" style={sx("gap:24px;flex:1")}><ObBody step={key} p={S.p} /></div>
      <div><ErrBox step={key} p={S.p} tried={!!S.obTried} /></div>
      <button className="cta" onClick={() => A.obNext(obValid(key, S.p))}>{st < OB_STEPS - 1 ? "Continue" : "Build my plan"}</button>
    </div>
  );
}
