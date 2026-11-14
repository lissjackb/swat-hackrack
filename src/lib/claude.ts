// Claude API router. Pick the model by TASK TYPE, in code (CLAUDE.md "Claude
// model routing"): callClaude(task, input) maps each task to a model tier, and
// the model IDs live in env vars so a swap is one line.
//
// Rules enforced here (so every caller gets them for free):
//   - The model never invents numbers. Callers pass a fully-built prompt with
//     the DB/formula/solver numbers already in it; Claude only writes words.
//   - Every call has a canned fallback: no API key, an error, or a response
//     slower than ~8s all return the caller's fallback string. The demo never
//     shows a spinner forever or a raw error.
//   - We log model, tokens in/out, and latency per call (for the AI-use slide).
import Anthropic from "@anthropic-ai/sdk";
import type { Plate } from "./types";

// Each task routes to a model TIER; the tier resolves to an env var. Defaults
// are known-valid IDs so the demo works even if the env vars are unset.
// NOTE: CLAUDE.md's table names `claude-sonnet-5-5` / `claude-haiku-5-5`; the
// defaults below use the actually-released ids. Override via the env vars to
// pin whatever the team standardizes on.
export type ClaudeTask =
  | "plan-build" // set goals — multi-factor reasoning (Sonnet)
  | "plan-edit" // code recomputes numbers; model rewrites text (Haiku)
  | "why-this-plate" // explain a plate the solver already chose (Haiku)
  | "daily-summary" // summarize the day's numbers (Haiku)
  | "weekly-summary"; // same, over a week (Haiku)

const TASK_TIER: Record<ClaudeTask, "plan" | "fast"> = {
  "plan-build": "plan",
  "plan-edit": "fast",
  "why-this-plate": "fast",
  "daily-summary": "fast",
  "weekly-summary": "fast",
};

function modelFor(task: ClaudeTask): string {
  if (TASK_TIER[task] === "plan") {
    return process.env.CLAUDE_MODEL_PLAN || "claude-sonnet-5";
  }
  return process.env.CLAUDE_MODEL_FAST || "claude-haiku-4-5-20251001";
}

const TIMEOUT_MS = 8000;

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface ClaudeCallInput {
  /** The full user prompt — all numbers already baked in by the caller. */
  prompt: string;
  /** Optional system prompt (framing/tone). */
  system?: string;
  /** Deterministic text to return if the call can't complete. Required. */
  fallback: string;
  maxTokens?: number;
}

/**
 * Run one Claude task. Returns the model's text, or `input.fallback` if there's
 * no API key, the call errors, or it exceeds ~8s. Never throws.
 */
export async function callClaude(
  task: ClaudeTask,
  input: ClaudeCallInput,
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    console.warn(`[claude] task=${task} no ANTHROPIC_API_KEY — using fallback`);
    return input.fallback;
  }

  const model = modelFor(task);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const msg = await anthropic.messages.create(
      {
        model,
        max_tokens: input.maxTokens ?? 200,
        ...(input.system ? { system: input.system } : {}),
        messages: [{ role: "user", content: input.prompt }],
      },
      { signal: controller.signal },
    );
    const ms = Math.round(performance.now() - started);
    const { input_tokens, output_tokens } = msg.usage;
    console.log(
      `[claude] task=${task} model=${model} in=${input_tokens} out=${output_tokens} ${ms}ms`,
    );
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    return text || input.fallback;
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    const reason = controller.signal.aborted ? `timeout >${TIMEOUT_MS}ms` : (err as Error).message;
    console.error(`[claude] task=${task} model=${model} FAILED (${reason}, ${ms}ms) — using fallback`);
    return input.fallback;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Tasks -----------------------------------------------------------------

/**
 * One or two upbeat sentences on why this plate fits the student's meal target.
 * Routes through callClaude("why-this-plate", …) → Haiku tier.
 */
export async function explainPlate(plate: Plate): Promise<string> {
  const fallback = deterministicNote(plate);
  if (plate.items.length === 0) return fallback;

  const items = plate.items.map((p) => `${p.servings}x ${p.item.name}`).join(", ");
  const prompt = `A student's target for this meal is ${plate.target.calories} cal, ${plate.target.protein}g protein, ${plate.target.carbs}g carbs, ${plate.target.fat}g fat.
This plate (${items}) gives ${plate.totals.calories} cal, ${plate.totals.protein}g protein, ${plate.totals.carbs}g carbs, ${plate.totals.fat}g fat.
In 1-2 encouraging sentences, explain why this plate fuels their goal. Focus on performance and hitting targets. Do not use good/bad food language.`;

  return callClaude("why-this-plate", { prompt, fallback, maxTokens: 120 });
}

function deterministicNote(plate: Plate): string {
  if (plate.items.length === 0) {
    return "No matching items for this meal yet — try loosening a filter or check back when the next menu loads.";
  }
  return `This plate lands at ${plate.totals.protein}g protein and ${plate.totals.calories} cal — on track for your ${plate.target.protein}g / ${plate.target.calories} cal meal target.`;
}
