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
- **Liss**: back end (scraper, Prisma/SQLite, API routes, LP solver)
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
2. **Today's Swarthmore Dining Center menu, with per-item nutrition**, loaded into SQLite. `data/menu-snapshot.json` is the fallback whenever the live source fails.
3. **Recommended plate.** The LP solver picks items and servings from the current meal that get closest to the meal's macro target, honoring restrictions (vegan, vegetarian, allergens). The Claude API writes a 1–2 sentence "why this plate" note.
4. **"I ate this" logging → progress.** Daily progress bars against targets, plus a week view.
5. **Whoop (thin slice).** Pull today's recovery and strain for ONE connected account and adjust that day's targets (e.g. more carbs after high strain, recovery-focused plate when recovery is red). Ship a **mock toggle** so the demo never depends on a live OAuth token.

## Stretch: only if MVP is done and demo-stable by Sat ~10:30am
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
- Keep secrets in `.env.local` (`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `ANTHROPIC_API_KEY`). **Never commit `.env*`.**

## Architecture (Liss's diagram)
Dining site (menu JSON/HTML) → scraper (`tsx` + Cheerio, or a direct JSON fetch) → SQLite via Prisma (`dev.db`) → Next.js API routes (macro targets + LP solver) ↔ React UI (profiles, menu, plates). API routes → Claude API (plate explanations). `data/menu-snapshot.json` is the demo fallback that feeds the scraper step.

## Checkpoints
- **Fri midnight:** today's menu with nutrition is in the DB (live or snapshot). The `/targets` endpoint returns numbers. The UI skeleton renders the menu.
- **Sat 10:30am:** profile → recommended plate → log → progress works end to end on one machine.
- **Sat 12:15pm:** feature freeze. Fix bugs only. Run the demo path 3× in a row with no errors.
- **Sat 1:00pm:** stop. Record the demo video. Build slides.

## Git workflow (keep it simple)
- `git pull` before you start, and commit and push small changes often.
- Stay in your own lane to avoid merge conflicts. Harlan: `src/app/(ui)` and components. Liss: `scripts/`, `prisma/`, `src/app/api/`. Talk before touching someone else's files.
- Never commit `dev.db` or `.env*` (`.gitignore` already covers both, so don't override it).

## AI-use log (required slide)
When a meaningful chunk of work is done with AI help, append one line to `docs/AI_LOG.md`:
`time | who | tool/model | what it did | how we checked it`.
Example check methods: spot-checked 5 menu items' macros against NetNutrition, hand-computed one target with the formula, read and tested generated code.

## Tone and safety
Frame Hackro around **fueling performance and hitting goals**, not restriction. Use no "good/bad food" language and no shaming copy. Allergen filters are hard constraints the solver must never violate.
