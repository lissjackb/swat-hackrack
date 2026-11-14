// Claude API: writes the 1-2 sentence "why this plate" note.
// Framing rule (CLAUDE.md "Tone and safety"): fueling performance & hitting
// goals — never "good/bad food" or restriction language.
import Anthropic from "@anthropic-ai/sdk";
import type { Plate } from "./types";

// Short, cheap explanations — Haiku is plenty. Bump to Sonnet if the copy
// needs more nuance. (Model ids: claude-haiku-4-5-20251001, claude-sonnet-5.)
const MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * One or two upbeat sentences on why this plate fits the student's meal
 * target. Falls back to a deterministic string if there's no API key, so
 * the demo never hard-fails on a missing secret.
 */
export async function explainPlate(plate: Plate): Promise<string> {
  const anthropic = getClient();
  const fallback = deterministicNote(plate);
  if (!anthropic || plate.items.length === 0) return fallback;

  const items = plate.items
    .map((p) => `${p.servings}x ${p.item.name}`)
    .join(", ");
  const prompt = `A student's target for this meal is ${plate.target.calories} cal, ${plate.target.protein}g protein, ${plate.target.carbs}g carbs, ${plate.target.fat}g fat.
This plate (${items}) gives ${plate.totals.calories} cal, ${plate.totals.protein}g protein, ${plate.totals.carbs}g carbs, ${plate.totals.fat}g fat.
In 1-2 encouraging sentences, explain why this plate fuels their goal. Focus on performance and hitting targets. Do not use good/bad food language.`;

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    return text || fallback;
  } catch (err) {
    console.error("explainPlate failed, using fallback:", err);
    return fallback;
  }
}

function deterministicNote(plate: Plate): string {
  if (plate.items.length === 0) {
    return "No matching items for this meal yet — try loosening a filter or check back when the next menu loads.";
  }
  return `This plate lands at ${plate.totals.protein}g protein and ${plate.totals.calories} cal — on track for your ${plate.target.protein}g / ${plate.target.calories} cal meal target.`;
}
