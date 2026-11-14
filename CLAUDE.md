@AGENTS.md

# Hackro — team context (repo: HackRack / swat-hackrack)

> Shared context for every Claude Code session in this repo. Claude reads this file automatically.
> Product name in the UI and in slides is **Hackro** ("hacking macros"). The repo and GitHub name stay **HackRack**.
> Status: DRAFT v0 scope, Fri Nov 13 ~10pm. Change it by committing edits to this file so all three of us stay in sync.

## What we're building (one sentence)
Hackro tells a Tri-Co student what to put on their plate *before* they walk into the dining hall. It does this by matching that day's real menu to their macro goals (and, if they have one, their Whoop recovery), then tracks what they actually ate against those goals.

## Problem (for the slide, 2–3 sentences)
Students walk into the dining hall without knowing what to eat, grab something at random, and leave with no idea what they ate nutritionally. They also can't tell whether they're on track for their goals over a day or a week. The menu and nutrition data are already public, but nobody connects them to a student's goals.

## Team
- **Harlan**: front end (React UI in the Next.js app)
- **Liss**: back end (scraper, Prisma/SQLite, API routes, day planner)
- **Griffy**: presentation, strategy, demo video, and floating help on both sides (seed data, Claude prompt, QA)

## Hackathon facts that constrain scope (ITrack)
- **Build windows:** Fri until midnight (Martin Hall), then Sat 10:00am–1:00pm. **Sat 1:00pm = stop building** (pitch-prep block until 3:30).
- **Demo video:** 1–2 min, uploaded to the Demo Video Drive folder by 4:00pm Sat. At most 1 min of it plays in the pitch.
- **Pitch:** 5 min hard limit, Google Slides, from the 2026 template. Judging starts 4:30pm on Zoom in Martin 127.
- **Required slides:** Title (names, class years, skill levels), Problem, Elevator pitch, Demo video, **AI use** (tools/models, where and why, how we checked results), Background (stack, hardest part), Next steps.
- **Rubric (40 pts total):** Innovation 10 · Practicality 10 · **Completion 10** (working, no visible bugs, judged relative to how we built it, e.g. with AI) · Presentation 10.
- **Theme:** "Fix the Tri-Co" fits best (a daily campus frustration).

## MVP: must work end-to-end by Sat 1:00pm
1. **Profile → targets.** Short onboarding (goal: build / maintain / cut / perform; height, weight, age, sex, activity level; dietary restrictions) → daily and per-meal calorie, protein, carb and fat targets. Standard formula (Mifflin-St Jeor × activity factor, protein in g/kg), shown transparently.
   - Allergies use a multi-select of the allergens the dining data actually tags (Milk, Egg, Fish, Shellfish, Peanut, Tree Nut, Soy, Sesame, Wheat, Gluten) plus "None". Editable later in profile. See "Allergy rules".
2. **Plan builder (sets the goals).** From the profile plus what the student wants ("add 5 lb of muscle by spring break"), Claude (**Sonnet 5.5**) drafts a goal plan: target, realistic timeline, weekly milestones, and phase changes (e.g. lean bulk → maintain). It returns structured JSON plus a short rationale. **Code computes and validates every number** (see "Plan guardrails"). This is a *nutrition goal plan*. It does not program workouts; that stays OUT.
3. **Plan editing.** The student tweaks parameters (timeline, rate, target weight, restrictions) → code recomputes targets → Claude (**Haiku 5.5**) rewrites the rationale and milestones. Edits never call Sonnet.
4. **Today's Swarthmore Dining Center menu, with per-item nutrition**, loaded into SQLite. `data/menu-snapshot.json` is the fallback whenever the live source fails.
5. **Recommended plate.** The day planner (`src/lib/planner/`, ported from the mockup; it replaced the LP solver on Sat 4am, see `docs/PLANNER_SPEC.md`) picks items and real portions for every meal of the day, lands the day on the calorie and protein targets, and honors restrictions (vegan, vegetarian, pescatarian, halal, allergens). The same module runs in the API routes and in the React UI. The Claude API (**Haiku 5.5**) writes a 1–2 sentence "why this plate" note.
6. **"I ate this" logging → progress.** Daily progress bars against targets, plus a week view.
7. **Daily meal summary.** At end of day (or on demand in the demo), Claude (**Haiku 5.5**) summarizes what was eaten against targets: hits, misses, and one suggestion for tomorrow. Numbers in the summary come from the DB, not from the model.
8. **Flex meal** (the team's working name was "cheat meal"; see Tone). The student marks a meal as flex. It's logged honestly (estimated macros, or a "skip" item), and **the planner re-balances the remaining meals that day** to stay as close to target as possible. In the demo: mark lunch as flex → dinner's recommended plate visibly changes.
9. **Whoop (thin slice).** Pull today's recovery and strain **once** for ONE connected account and adjust that day's targets from the real numbers (more carbs after high strain, more protein when recovery is red; rule in `docs/PLANNER_SPEC.md`). Ship a **mock toggle** so the demo never depends on a live OAuth token. Refreshing Whoop through the day is a pitch / Next steps item, not built tonight.

**Cut order if we're behind at the Sat 10:30am checkpoint** (cut from the top first): live Whoop (keep the mock) → plan editing (re-run onboarding instead) → flex meal → daily summary. Never cut the core loop: plan/targets → menu → plate → log → progress.

## Claude model routing (decided Fri night)
Pick the model by **task type, in code**: one helper (e.g. `src/lib/claude.ts` → `callClaude(task, input)`) maps each task to a model. Model IDs live in env vars so a swap is one line.

| Task | Model | Env var | Why |
|---|---|---|---|
| Plan build (set goals) | `claude-sonnet-5-5` | `CLAUDE_MODEL_PLAN` | Multi-factor reasoning on goals, timeline, and tradeoffs. Rare (about 1×/user/month), so the cost is negligible |
| Plan edit | `claude-haiku-5-5` | `CLAUDE_MODEL_FAST` | Code recomputes the parameters; the model only rewrites text |
| Why-this-plate | `claude-haiku-5-5` | `CLAUDE_MODEL_FAST` | The solver already chose the plate; Haiku explains it. Speed matters in a live demo |
| Daily summary | `claude-haiku-5-5` | `CLAUDE_MODEL_FAST` | Summarizes numbers we pass in |
| Weekly summary (stretch) | `claude-haiku-5-5` | `CLAUDE_MODEL_FAST` | Same as daily, over a longer window |

Rules:
- **The model never invents nutrition numbers.** Macros, targets, and totals come from the DB, the formula, or the solver, and are passed *into* the prompt. Claude writes words and structure.
- **Every call has a canned fallback** (template text built from the same numbers) if the API errors or takes longer than ~8s. The demo must never show a spinner forever or an error.
- Log model, tokens in/out, and latency per call in the console. The usage numbers go in the design-decisions slide.
- Full cost matrix and rationale: `docs/DESIGN_DECISIONS.md`.

## React port of the mockup (decided Sat 4am)
- The React UI is a port of `docs/mockup/hackro-mockup.html`. Rules, line map and lanes: `docs/PORT_PLAN.md`. **Everything in the mockup is in scope for the port** (streaks, rewards, body goal, weekly report, etc.), even where the MVP list above doesn't name it.
- Where this file and the mockup disagree: the mockup wins on layout, order, copy and planner behavior; this file wins on safety (allergy rules, guardrails, tone, no medical advice). If you can't tell which applies, stop and ask.

## Allergy rules (HARD constraints, enforced in code)
- An item tagged with any of the user's allergens is **filtered out before the planner runs**. It is never a candidate, so it can never be recommended, swapped in, or suggested by Claude. Don't rely on the planner or the prompt to avoid it.
- **Fail closed:** if an item has *no* allergen data at all, it's excluded for any user with at least one allergy. Missing data ≠ safe.
- Claude prompts receive only the already-filtered plate. Claude never proposes additional foods outside the plate.
- Flex meals and manual logging can include anything (the user chose it), but show a clear warning if a logged item carries one of their allergens.
- Always show this line on the plate card: "Allergen info comes from Dining Services. Cross-contact is possible, so confirm with staff." Hackro reduces risk; it can't guarantee safety.
- **Test it:** a unit test creates a user with a peanut allergy and asserts that no recommended plate ever contains a peanut-tagged item, across every meal in the snapshot.

## Plan guardrails (enforced in code, not in the prompt)
- Calories never go below a safe floor (do not go under BMR from the formula) and never more than ~500 kcal/day away from maintenance in either direction.
- Weight-change rate capped at about 0.5–1% of body weight per week. If a requested goal violates this, the plan **extends the timeline** and says so plainly.
- Protein within ~1.6–2.2 g/kg for build/perform goals.
- If Sonnet's JSON is malformed or out of bounds → clamp it to the bounds, use the formula plan, and keep going. Never block the user.

## Stretch: only if MVP is done and demo-stable by Sat ~10:30am
- **First stretch pick: carb-conscious mode** (supports students who count carbs, e.g. for diabetes). The student *enters their own* per-meal carb budget (it comes from their care team; Hackro never calculates it). The planner treats it as a hard cap, the plate card shows carbs prominently, and an in-app (not push) "check your glucose before you eat" reminder appears at mealtimes. **Never** any insulin or medication dosing advice, in the UI or in Claude prompts. If it isn't built, it goes on the Next steps slide, with continuous glucose monitor integration as the longer-term version. In the pitch, say "supports students who count carbs," not "manages diabetes."
- Haverford DC and Bryn Mawr (Erdman, New Dorm) menus. They run on a different menu system than Swarthmore, so each one needs its own scraper.
- Whoop OAuth for any user (not just our one demo account).

## OUT for the hackathon: slides / "Next steps" only
- B2B vs B2C pricing, institution sales, subscription tiers
- Workout recommendations (the Google Doc lists "choosing the workout you do". Cut it: it's a second product)
- Real auth / multi-user accounts, a native mobile app, notifications
- Monthly and yearly analytics. (The week view uses **seeded demo history**, and we say so out loud in the pitch.)
- Other wearables (Apple Health, Garmin, Oura)

**Rule for anyone, Claude included:** if a task isn't in the MVP list, don't build it. Suggest adding it to "Next steps" instead.

## Data source notes (verify first thing)
- `dash.swarthmore.edu/menu/dining-center/` is a Gatsby/React page. **The menu loads client-side with JavaScript**, so fetching the HTML and parsing it with Cheerio will probably return no menu items. Open Chrome DevTools → Network → Fetch/XHR on that page and find the JSON request it makes. Hit that endpoint directly.
- The page links to **CBORD NetNutrition** (`netnutrition.cbord.com/nn-prod/swarthmore`). That's probably where per-item calories and macros live, which would mean we don't need a separate nutrition lookup.
- The page uses dietary/allergen labels (Vegan, Vegetarian, Gluten Free, Halal, Kosher, Milk, Egg, Peanut, Tree Nut, Soy, Sesame, Shellfish, Fish, Wheat, Pork, Alcohol, and others). Use them for the restriction filters.
- Haverford and Bryn Mawr publish nutrition through their own web menu system. Out of scope unless we reach stretch.
- If live scraping isn't working by **Fri 11:30pm**, freeze on `data/menu-snapshot.json` (today's real menu, captured by hand) and keep moving. A live scraper is not what wins points.

## Whoop notes
- Whoop's API is **OAuth 2.0, not a plain API key**. It needs a developer app (client ID + secret) and a redirect URI such as `http://localhost:3000/api/whoop/callback`, and the user has to log in and approve scopes.
- Scopes we need: `read:recovery`, `read:cycles` (strain), optionally `read:workout`, plus `offline` for refresh tokens. Access tokens expire in about an hour.
- Keep secrets in `.env.local` (`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, plus `CLAUDE_MODEL_PLAN` / `CLAUDE_MODEL_FAST`). **Never commit `.env*`.**
- The Anthropic API is billed separately from Claude Pro. Use one Console org with prepaid credit and a low spend limit; each of us gets our own key in that org.

## Architecture (Liss's diagram)
Dining site (menu JSON/HTML) → scraper (`tsx` + Cheerio, or a direct JSON fetch) → SQLite via Prisma (`dev.db`) → Next.js API routes (macro targets + day planner) ↔ React UI (profiles, menu, plates). The planner in `src/lib/planner/` is shared: API routes and the React store import the same module. API routes → Claude API (plate explanations). `data/menu-snapshot.json` is the demo fallback that feeds the scraper step.

## Checkpoints
- **Fri midnight:** today's menu with nutrition is in the DB (live or snapshot). The `/targets` endpoint returns numbers. The UI skeleton renders the menu.
- **Sat 10:30am:** plan → recommended plate → log → progress → daily summary works end to end on one machine. If not, apply the cut order.
- **Sat 12:15pm:** feature freeze. Fix bugs only. Run the demo path 3× in a row with no errors.
- **Sat 1:00pm:** stop. Record the demo video. Build slides.

## Git workflow (keep it simple)
- **HARD RULE (Liss): never push without pulling first.** The sequence is always `git pull` → resolve any conflicts → re-run the app to confirm it still works → `git push`. If you're Claude, run `git pull` yourself immediately before any `git push`, and stop to ask the human if the pull produces conflicts. Never use `git push --force`.
- `git pull` before you start working, too. Commit and push small changes often, always pulling first.
- Stay in your own lane to avoid merge conflicts. Harlan: `src/app/(ui)` and components. Liss: `scripts/`, `prisma/`, `src/app/api/`. Talk before touching someone else's files.
- Never commit `dev.db` or `.env*` (`.gitignore` already covers both, so don't override it).

## AI-use log (required slide)
When a meaningful chunk of work is done with AI help, append one line to `docs/AI_LOG.md`:
`time | who | tool/model | what it did | how we checked it`.
Example check methods: spot-checked 5 menu items' macros against NetNutrition, hand-computed one target with the formula, read and tested generated code.

## Tone and safety
Frame Hackro around **fueling performance and hitting goals**, not restriction. Use no "good/bad food" language and no shaming copy. That's why the UI says **"flex meal"**, not "cheat meal": a flex meal is a planned part of the week, not a failure. Allergen filters are hard constraints the planner must never violate.
