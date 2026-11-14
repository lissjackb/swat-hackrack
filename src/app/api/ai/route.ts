// POST /api/ai — Claude text for the UI (PORT_PLAN: the mockup's
// window.claude sampling becomes this route). Body: { kind, data, model? }.
// Prompts are the mockup's PROMPTS (lines 795–800) verbatim; `data` carries
// every number (the model never invents nutrition numbers — CLAUDE.md).
// Returns { text } — null when Claude is unavailable, erred, or timed out;
// the client keeps its template fallback.
import { callClaude, type ClaudeTask } from "@/lib/claude";

type Kind = "plate_why" | "daily_summary" | "weekly_report" | "goal_plan";

const PROMPTS: Record<Kind, (d: unknown) => string> = {
  plate_why: (d) => `You write one or two short sentences (max 40 words) for a college nutrition app explaining why this dining hall plate was chosen. Plain text, no markdown, no emoji, no new numbers beyond those given. Never use the word "cheat".\nData: ${JSON.stringify(d)}`,
  daily_summary: (d) => `You write a 2-sentence end-of-day note for a college nutrition app: first sentence says what went well or missed using only these numbers, second gives one concrete suggestion for tomorrow using only the menu items given. Plain text, max 45 words, no markdown, no emoji, no new numbers, never the word "cheat".\nData: ${JSON.stringify(d)}`,
  weekly_report: (d) => `You write a short weekly report paragraph (max 60 words) for a college nutrition app using only these numbers. Plain text, no markdown, no emoji, no new numbers.\nData: ${JSON.stringify(d)}`,
  goal_plan: (d) => `You write a 2-sentence plan summary (max 50 words) for a college student's body-weight goal using only these numbers. Explain the pace and, if the date was extended, why in plain words. Plain text, no markdown, no emoji, no new numbers.\nData: ${JSON.stringify(d)}`,
};

/** Task routing (CLAUDE.md model table): goal_plan is the Sonnet plan-build,
 * unless it's an edit rewrite (model: "haiku" → plan-edit); everything else
 * is the fast tier. */
function taskFor(kind: Kind, model?: string): ClaudeTask {
  if (kind === "goal_plan") return model === "haiku" ? "plan-edit" : "plan-build";
  if (kind === "daily_summary") return "daily-summary";
  if (kind === "weekly_report") return "weekly-summary";
  return "why-this-plate";
}

export async function POST(request: Request) {
  let body: { kind?: Kind; data?: unknown; model?: "haiku" | "sonnet" };
  try {
    body = await request.json();
  } catch {
    return Response.json({ text: null }, { status: 400 });
  }
  const kind = body.kind;
  if (!kind || !(kind in PROMPTS)) {
    return Response.json({ text: null }, { status: 400 });
  }
  const text = await callClaude(taskFor(kind, body.model), {
    prompt: PROMPTS[kind](body.data ?? {}),
    fallback: "",
    maxTokens: 160,
  });
  return Response.json({ text: text || null });
}
