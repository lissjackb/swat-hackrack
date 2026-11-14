# Hackro — design decisions (for the pitch)

Running log of decisions worth showing judges ("Background" and "AI use" slides). Add new ones at the bottom: decision, options considered, why, evidence.

---

## 1. Which Claude model does what (decided Fri Nov 13, ~10:30pm)

**Decision:** Route by task. **Sonnet 5.5** builds the goal plan. **Haiku 5.5** handles everything else: why-this-plate, plan edits, daily and weekly summaries.

**Why:**
- Building a plan means reasoning over goals, timeline, and tradeoffs, and it happens about once per user per month, so the stronger model costs pennies.
- Everything else is explaining numbers our code already computed. Haiku is fast (it matters in a live demo) and costs about 1/20th of Sonnet.
- **The AI never decides nutrition numbers.** A deterministic formula and an LP solver do the math; Claude writes the explanation. This is also how we check the AI's results: every number shown can be traced back to the database or the solver.

### API prices (per million tokens, standard API, Nov 2026)
| Model | Input | Output |
|---|---|---|
| Haiku 5.5 | $0.10 | $0.50 (prompts ≤100K tokens) |
| Sonnet 5.5 | $2 | $10 |
| Opus 5.5 | $4 | $20 |

### Usage assumptions (one active student, one month)
| Call | Per month | Tokens in / out (est.) |
|---|---|---|
| Why-this-plate (3 meals/day) | 90 | 1,500 / 150 |
| Daily meal summary | 30 | 3,000 / 300 |
| Weekly summary | 4 | 5,000 / 500 |
| Plan build | 1 | 3,000 / 1,500 |
| Plan edit | 4 | 2,000 / 300 |

### Cost matrix
| Strategy | Per user / month | Per 1,000 users / month | Share of a hypothetical $5/mo subscription |
|---|---|---|---|
| All Haiku 5.5 | $0.04 | $39 | 0.8% |
| **Routed (our choice): Sonnet for plan build, Haiku for the rest** | **$0.06** | **$59** | **1.2%** |
| All Sonnet 5.5 | $0.78 | $784 | 16% |
| All Opus 5.5 | $1.57 | $1,568 | 31% |

Cost per single call: why-this-plate $0.0002 (Haiku) · daily summary $0.0005 (Haiku) · plan build $0.021 (Sonnet).

**Hackathon build + demo** (about 300 plate calls, 60 daily summaries, 30 plan builds, 40 edits): about **$0.75 routed** versus about $5.90 if everything ran on Opus.

**Pitch line:** "Routing by task gives us Sonnet-quality planning for about 1% of a $5 subscription. AI is not our cost problem; data integration for each campus is."

**Caveats to say out loud if asked:** token counts are estimates until we log real usage; prices are list prices as of Nov 2026; the $5 subscription is illustrative, not a pricing decision.

Sources: platform.claude.com/docs/en/about-claude/pricing; Haiku 5.5 launch coverage (Oct 2026).

---

## 2. Deterministic math, AI for language
The formula and the LP solver own every target and every plate. Claude only explains them. Guardrails (calorie floor, ±500 kcal/day, 0.5–1% body weight/week, protein bounds) are enforced in code. *Why:* nutrition advice for students has to be checkable and safe, and LLMs can do arithmetic wrong.

## 3. Fallbacks everywhere
`menu-snapshot.json` if the live menu fails; mock Whoop toggle; template text if the Claude API errors. *Why:* the Completion score depends on a demo with no visible failures.

## 4. "Flex meal", not "cheat meal"
A flex meal is planned, and the solver rebalances the rest of the day around it. *Why:* framing around fueling performance, not restriction or guilt.

## 5. The mockup day planner replaced the LP solver (Sat 4am)
We dropped the LP because its plates weren't realistic (any 4 items), it planned one meal in isolation with no day-level context, and its restriction filter had bugs (vegetarian dropped vegan-labeled items, pescatarian broken, halal applied to everything, no fail-closed on missing allergen data). The mockup planner — now ported to `src/lib/planner/`, one pure-TS module imported by both the API routes and the React store — works in three stages: **template ranking** (realistic main + carb + side plates per meal, 6 alternatives), **greedy portion balancing** in real serving steps until the day lands within ±3% of the calorie target with protein met (or it reports the closest the menu allows), and **re-planning** of only the not-yet-eaten meals after something is logged or flexed. `conflict()` is the single hard restriction filter on server and client, and it fails closed: an item with no allergen data is excluded for anyone with an allergy. Whoop adjusts targets from the real numbers (strain <10 → +0, 10–13.9 → +100, ≥14 → +150 kcal into carbs; recovery <34 → protein ×1.1), capped with the goal surplus at +500 kcal over TDEE; it's pulled once for the demo, and all-day refresh is Next steps. Parity is tested: the TS port reproduces the mockup engine's exact plates (item, portion, kcal) for four fixture profiles across both demo days (`scripts/test-planner.ts` + `tests/fixtures/`).
