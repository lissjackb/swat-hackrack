"use client";
// The app shell — the mockup's render() router (1523–1544): view switch,
// pushed-screen stack, 5 tabs, sheet layer, toast.
import { HackroProvider, useHackro } from "@/lib/hackro/store";

import { Ic, IconSprite } from "@/components/hackro/Icon";
import { Login } from "@/components/hackro/screens/Login";
import { Onboarding } from "@/components/hackro/screens/Onboarding";
import { Gen } from "@/components/hackro/screens/Gen";
import { Reveal } from "@/components/hackro/screens/Reveal";
import { Connect } from "@/components/hackro/screens/Connect";
import { Today } from "@/components/hackro/screens/Today";
import { Plan } from "@/components/hackro/screens/Plan";
import { Meal } from "@/components/hackro/screens/Meal";
import { Swap } from "@/components/hackro/screens/Swap";
import { Food } from "@/components/hackro/screens/Food";
import { Fuel } from "@/components/hackro/screens/Fuel";
import { Dining } from "@/components/hackro/screens/Dining";
import { Track } from "@/components/hackro/screens/Track";
import { BodyGoal } from "@/components/hackro/screens/BodyGoal";
import { Week } from "@/components/hackro/screens/Week";
import { You } from "@/components/hackro/screens/You";
import { Goals } from "@/components/hackro/screens/Goals";
import { SheetLayer } from "@/components/hackro/screens/Sheets";

const TABS: [string, string, string][] = [
  ["today", "i-home", "Today"],
  ["plan", "i-plan", "Plan"],
  ["dining", "i-dining", "Dining"],
  ["goals", "i-target", "Goals"],
  ["you", "i-user", "You"],
];

function Shell() {
  const { S, A, ready, toast } = useHackro();
  if (!ready) return <div className="app" />;

  let body: React.ReactNode = null;
  let withTabs = false;
  if (S.view === "login") body = <Login />;
  else if (S.view === "ob") body = <Onboarding />;
  else if (S.view === "gen") body = <Gen />;
  else if (S.view === "reveal") body = <Reveal />;
  else if (S.view === "connect") body = <Connect />;
  else {
    withTabs = true;
    const top = S.stack[S.stack.length - 1];
    if (top) {
      const i = top.indexOf(":");
      const k = i < 0 ? top : top.slice(0, i);
      const v = i < 0 ? "" : top.slice(i + 1);
      body =
        k === "meal" ? <Meal id={v} />
        : k === "swap" ? <Swap id={v} />
        : k === "food" ? <Food arg={v} />
        : k === "fuel" ? <Fuel />
        : k === "goals" ? <Goals />
        : k === "week" ? <Week />
        : k === "bodygoal" ? <BodyGoal />
        : null;
    } else {
      body = { today: <Today />, plan: <Plan />, dining: <Dining />, goals: <Track />, you: <You /> }[S.tab] ?? <Today />;
    }
  }

  return (
    <>
      <div className="app">
        {body}
        {withTabs ? (
          <nav className="tabs" aria-label="Tabs">
            {TABS.map(([k, i, l]) => (
              <button key={k} className={`tab ${S.tab === k ? "on" : ""}`}
                onClick={() => A.tab(k as typeof S.tab)}
                aria-current={S.tab === k ? "page" : undefined}>
                <Ic i={i} />{l}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
      <SheetLayer />
      {toast ? (
        <div key={toast.key} className="toast" role="status">
          <Ic i="i-check" s="width:16px;height:16px;color:#2E7D32;stroke-width:2.75" />{toast.msg}
        </div>
      ) : null}
    </>
  );
}

export default function Page() {
  return (
    <HackroProvider>
      <IconSprite />
      <Shell />
    </HackroProvider>
  );
}

