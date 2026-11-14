"use client";
import { HackroProvider, useHackro } from "@/lib/hackro/store";
import Onboarding from "@/components/hackro/Onboarding";
import Today from "@/components/hackro/Today";
import Dining from "@/components/hackro/Dining";
import You from "@/components/hackro/You";

const TABS = [
  { id: "today", label: "Today" },
  { id: "dining", label: "Dining" },
  { id: "you", label: "You" },
] as const;

function Shell() {
  const { ready, view, tab, setTab } = useHackro();

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <span className="text-2xl font-bold tracking-[0.3em]">HACKRO</span>
      </div>
    );
  }

  if (view === "onboarding") return <Onboarding />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col">
      <main className="flex flex-1 flex-col">
        {tab === "today" && <Today />}
        {tab === "dining" && <Dining />}
        {tab === "you" && <You />}
      </main>
      <nav className="sticky bottom-0 grid grid-cols-3 border-t border-surface-2 bg-background/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1 py-2 text-xs font-semibold ${
              tab === t.id ? "text-foreground" : "text-muted-2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function Page() {
  return (
    <HackroProvider>
      <Shell />
    </HackroProvider>
  );
}
