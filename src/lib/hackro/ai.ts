"use client";
// Claude text for the UI (mockup 787–816): callClaude becomes POST /api/ai.
// Every number is already in `data`; Claude writes words only. The template
// fallback stays on screen until (unless) Claude's text arrives; errors and
// slow responses just keep the fallback (no spinner, no error — CLAUDE.md).
import { useEffect, useReducer } from "react";

export function aiId(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return "ai" + h.toString(36);
}

export type AiKind = "plate_why" | "daily_summary" | "weekly_report" | "goal_plan";

const AI = new Map<string, { text: string; src: "template" | "claude" }>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** The mockup's aiText(): returns the fallback immediately, upgrades to
 * Claude's text when /api/ai responds. Cached per (kind, data). */
export function useAiText(kind: AiKind, data: unknown, fallback: string, model: "haiku" | "sonnet" = "haiku"): { text: string; src: string } {
  const key = aiId(kind + JSON.stringify(data));
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    listeners.add(force);
    return () => { listeners.delete(force); };
  }, []);

  useEffect(() => {
    if (AI.has(key)) return;
    AI.set(key, { text: fallback, src: "template" });
    fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, data, model }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((r: { text?: string | null } | null) => {
        const t = String(r?.text || "").trim().replace(/\bcheat\w*/gi, "flex");
        if (t) { AI.set(key, { text: t, src: "claude" }); notify(); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return AI.get(key) ?? { text: fallback, src: "template" };
}
