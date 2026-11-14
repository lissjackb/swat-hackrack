// Hackro home. Harlan's lane: this route group — src/app/(ui) — plus
// src/components. The (ui) group doesn't change the URL (still "/"); it
// just keeps all the screens together and out of the api/ tree.
//
// Build the real onboarding -> menu -> plate -> log -> progress flow here,
// talking to the /api routes. This is only a placeholder.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Hackro</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Know what to put on your plate before you walk into the dining hall.
      </p>
      <p className="text-sm text-zinc-500">
        UI scaffold — build the onboarding, menu, recommended plate, and
        progress screens here. API routes live under{" "}
        <code className="font-mono">/api</code>.
      </p>
    </main>
  );
}
