# Replace the LP solver with the mockup planner, and feed it real Whoop data

**Owner:** Liss (`src/lib`, `src/app/api`, `prisma`, `scripts`). **Decided Sat 4am:** the team prefers how the mockup planner behaves, so it replaces the LP solver.
**Read first:** `docs/PORT_PLAN.md` (rules, mockup line map). Every rule there applies here. Most important: **port the mockup logic exactly.** The only places this spec changes mockup behavior are marked **CHANGE**.

## Why

The LP solver plans one meal in isolation. It returns one plate, which can be any 4 items, and its restriction filter has bugs. The mockup planner plans the whole day. It builds realistic plates (main + carb + side), offers 6 alternatives per meal, uses real portion units, and re-plans the rest of the day after something is eaten or flexed. That last part is the flex-meal demo.

## Target architecture: one planner, used by server and client

Create `src/lib/planner/`: pure TypeScript with **no imports** from React, Next, Prisma, `window` or `localStorage`, so it runs in Node and in the browser.

- The React store (PORT_PLAN Terminal A) imports it directly, so every tap re-plans instantly with no network round trip.
- The API routes import the same module, so server numbers always equal what's on screen.
- **This replaces the `engine.ts` step in PORT_PLAN.** Don't port the engine twice.

| File | Port from mockup lines | Contents |
|---|---|---|
| `data.ts` | 154–279, 397–402 | **MENU** (built-in menu, used as the fallback whenever a DB slot is empty, the same way the mockup does), THEMES, NUT, MEALS, DAYS, NOW, VENUES, GOALS; helpers `fmt`, `mealById` |
| `restrictions.ts` | 280–316, 433–454 | ALLERGENS, MAJOR, DIET_VALUES, dietOf / allergiesOf / otherOf, userHits, allergenState, `conflict`, `fits` |
| `items.ts` | 403–432, 1680–1713, 1750–1786 | `PlannerItem` type, `fromMenuItems(dbRows)` adapter, menuFor / itemsFor / findItem / stationsOf |
| `targets.ts` | 455–473, 675–677 | AF, SURPLUS, `targets()`, RANGE, `rangeK`. Whoop logic per the Whoop section |
| `plan.ts` | 474–717 | rank, stepOf, boundsOf, balance, augment, baseline, plan, applySwaps, lockApply, rebalance, eatenFixed, dayProjection, planStatus, completion, slack, nextMeal, todayHit, dayTotals, snapM (+ qty / partText / dispName from 730–752 if plan code needs them) |
| `context.ts` | 384–388, 777 | `PlanContext` type (replaces global `S`), `has(ctx, perm)` |
| `index.ts` | | `createPlanner(items, ctx)` → `{targets, plan, planStatus, completion, ...}` |

**Globals → explicit inputs.** Every function that reads `S` takes a `PlanContext` instead. That covers `p`, `device`, `perms`, `whoop`, `seed`, `swaps`, `itemSwaps`, `adds`, `ate`, `done`, `locked`, `flex`, `extras` and `now`. The caches (`CACHE`, `RANK`, `BASE`) live inside the `createPlanner` closure rather than at module level, because module-level caches would be shared across users on the server. Keep the mockup's cache keys.

**The planner never mutates `ctx`.** The mockup mutates `S` in place, but the React store must create a new state object on every action, or React won't re-render. The React Compiler is on in this repo, which makes in-place mutation even riskier. Freeze `ctx` in the tests (`Object.freeze`, deep) so any mutation throws.

**Item adapter (`fromMenuItems`).** Input: DB `MenuItem` rows for the demo dates. Output: `Record<mealId, {station, items}[]>`, the same shape as `menuFor`. Map each row's `{date, meal}` to a mealId with `API.map` (1680–1690). Rows that don't map are ignored. A slot with no usable rows falls back to the built-in `MENU`, as in the mockup. Copy what `bootstrapRealData` (1750–1786) does to each DB row:
- If the name has a NUT entry, copy it. Overwrite kcal, protein, carbs and fat with the DB values when DB calories > 0.
- Else if DB calories > 0, build a new entry: qty 1, unit `'serving'`, role `guessRole(name)`, flags `guessFlags(name, dietary)`.
- Else skip the item.
- `tags` = lowercased `dietary` + `allergens`. `theme` = name is in THEMES.
- Keep the station, plus `menuItemId` so logging can point at the DB row.

**Meal slots.** Keep the mockup's MEALS and its mapping to DB `{date, meal}` (`API.map`, 1680–1690). `sat-s` (snack) reuses breakfast, Field of Greens station only. **Don't widen the existing `Meal` type:** `Targets.perMeal` is a `Record<Meal, …>`, and widening it breaks `targets.ts`, `/api/progress` and `test-solver`. Instead, add `export type DbMeal = Meal | "brunch" | "latenight"` (the values `scripts/scrape.ts` writes) and use it in the planner and the new routes. MEALS is hard-coded to Sat Nov 14 and Sun Nov 15. Generalizing it is a "Next steps" item, not tonight.

## Targets: one formula, matching the mockup

Rewrite `src/lib/targets.ts` `computeTargets(profile, whoop?)` as a thin wrapper over `planner/targets.ts`. Keep its signature and the `Targets` shape, because `/api/targets`, `/api/progress` and `test-solver` use it. Add `adj`, `adjNote`, `floor`, `floored`, `base`, `dev`, `afLabel` to `breakdown` (the How-we-got-it screen needs them).

The mockup rules:
- **Cut:** −min(20% of TDEE, 500).
- **Build:** +min(350, 15% of TDEE). **Perform:** +min(150, 15% of TDEE). **Maintain:** no change.
- **Floor:** max(BMR, 1200 for female / 1500 for male). Round to 10.
- **Fat:** 27% of base. **Protein:** g/kg per GOALS. **Carbs:** the remainder.
- **Activity factor: two inputs, same result.** The client knows training `days` and uses the mockup's AF rows exactly (needed for parity). The server only has the DB `activityLevel` enum. Its bins line up with the mockup's days (`createProfile`: ≤1 light, ≤3 moderate, ≤5 active, else veryActive), so map: `light` 1.375, `moderate` 1.465, `active` 1.55, `veryActive` 1.725. Keep `sedentary` at 1.2; only API-created profiles use it. The planner uses `p.days` if it's set, otherwise the enum.
- **`perMeal`:** keep breakfast/lunch/dinner. Fill it from the Saturday MEALS shares (`sat-b` .26, `sat-l` .32, `sat-d` .32), normalized over those three.
- **Units:** the planner works in kg and cm internally. The client converts with the mockup's formula (`lb*0.4536`, `(ft*12+in)*2.54`) without rounding. DB-stored values are rounded, so allow ±10 kcal between the two.

**CHANGE (bug fix):** the mockup's `createProfile` (1718) drops `halal` (stored as `p.halal`, not in `restrictions`). Send `'halal'` in `restrictions`, and have the planner set `p.halal = restrictions.includes('halal')`.

## Restrictions: `conflict()` replaces `filterByRestrictions`

`conflict()` is the hard filter everywhere, on server and client. Keep an exported `filterByRestrictions(items, restrictions)` as a wrapper (`items.filter(i => !conflict(i, p))`) so `test-solver.ts` still compiles. This fixes the LP filter's bugs:

- Vegetarian no longer drops items labeled only "Vegan".
- Halal now applies to meat only.
- Pescatarian now works.
- Unlabeled items are excluded for anyone with an allergy ("No allergen data").
- The typed-in "other" allergy matches dish names.
- A gluten allergy excludes wheat.

## API

- **`POST /api/plan`** `{profileId, day: 'sat'|'sun', ctx?}`:
  - Loads the profile, the menu for that day's meals (`fromMenuItems`) and today's Whoop snapshot (Whoop section).
  - Merges the client's `ctx` (swaps, flex, never-list, locked, …). If `ctx.ate` / `ctx.extras` are missing, derives them from `LogEntry`: menu items → `ate`, custom entries → `extras`.
  - Returns `{targets, status: planStatus(day), meals: [{mealId, name, date, dbMeal, kind, tgt, parts: [{menuItemId, name, station, m, portion: partText, kcal, p, c, f}], tot, alternatives: ranked mains, removed, trimmed, boosted, deltaK, locked}]}`.
  - Numbers only. Claude text goes through `/api/ai` (PORT_PLAN).
- **`POST /api/recommend`** stays for compatibility, same request body. Map `{date, meal}` to a mealId with `API.map`. If there's no slot for that date and meal, synthesize one: `kind` is `'breakfast'` for breakfast or brunch and `'meal'` otherwise, built from that date's DB rows. Then run `rank()` for that one meal against the given target and return the top result as a `Plate`. `servings` can now be fractional, in 0.5 steps. Keep `explainPlate`, and use the mockup's `plateWhy` template (818–825) as its canned fallback. Mark it deprecated in a comment.
- **Remove the LP code** from `recommend.ts` (`relaxedServings`, `bestIntegerPlate`, `MACRO_IMPORTANCE`) once the tests pass. Then `npm uninstall javascript-lp-solver`.

## Whoop: pull once for the demo, adjust from the real numbers

**Scope tonight: one pull per session.** Refreshing Whoop through the day to keep updating calorie needs is a **pitch / Next steps** item (see the bottom of this section). Don't build it.

The mockup has three problems here:
- It shows hard-coded recovery 88% and strain 14.2 (`WEAR`, line 381) unless you've just come back from OAuth, and the values revert on refresh.
- It adds a flat +150 kcal whenever Whoop is connected, whatever the numbers say.
- It never uses the backend's mock path.

**Backend: one small fix, no schema change.** Keep `/api/whoop` as it is (`mock` path by default; `mock=false` fetches live once and caches today's `WhoopDay`). The mock path reads today's `WhoopDay`, so once a live pull has happened, later calls return the live row. One gap:
- **Fallback for profiles with no Whoop data:** in the mock path, if the requested profile has no `WhoopDay` for that date, return its most recent row. If it has none at all, return the newest `demo-profile` row with `source: "seed"`.
- Without this, every profile created by onboarding gets a 404, because only `demo-profile` is seeded. The demo user would see no adjustment.
- The same fallback covers a seed that ran on Friday's date.
- The seed already has strain 15.2 and recovery 55, so the adjustment shows in the demo. Don't change it.

**One adjustment rule (`planner/targets.ts` → `whoopAdjustment(snapshot, T)`)**

**CHANGE.** This replaces the mockup's flat +150 and the old backend `adjustForWhoop`. Applies only when Whoop is connected and the `recovery` permission is on (`has('recovery')`):

| Whoop data | Effect |
|---|---|
| strain < 10 | +0 kcal |
| strain 10–13.9 | +100 kcal |
| strain ≥ 14 | +150 kcal (the mockup's number) |
| recovery < 34 (red) | protein × 1.1 (recovery-focused plate) |
| recovery 34–66 / ≥ 67 | no protein change |

- Added kcal go to carbs automatically: fat is computed from `base` and protein is fixed, so the planner shifts portions toward carbs.
- **Guardrail:** cap goal adjustment + Whoop adjustment at **+500 kcal over TDEE** (CLAUDE.md). For Build this means +350 + 150 = 500, which is exactly the mockup's number.
- `dev` and `adjNote` explain what happened, e.g. "Whoop: strain 15.2 → +150 kcal, carb-leaning". `computeTargets` uses the same function, so `/api/progress` and `/api/plan` agree with the screen.
- Keep all thresholds as named constants in one place.

**Client (store, React port)**
- Hold `whoop: {recovery, strain, mock, source}` in store state, persisted. It replaces `WEAR`.
- Call `/api/whoop` **once** after the profile loads (`?profileId=…&date=2026-11-14`).
- After an OAuth return (`?whoop=connected`, mockup 1735), call it **once** with `mock=false`.
- No other calls: no refresh on render, tab switch, navigation or focus.
- The planner reads the snapshot from context. If there's no snapshot or `has('recovery')` is off, there's no adjustment.
- Replace every hard-coded Whoop claim with the data:
  - `plateWhy` says "high-strain day" only when strain ≥ 14. Today it uses `has('recovery')`.
  - The Fuel ring label "Optimal" (line 1295) comes from the recovery band: ≥ 67 / 34–66 / < 34. Ask Griffy for the wording of the other two bands; the mockup only has "Optimal".
  - The Today card shows the real recovery and strain.

**For the pitch, not the build ("Next steps"):** in production, the server would re-pull Whoop on a schedule. Recovery is scored once each morning, and strain builds through the day, so strain would be re-pulled about every 15 min while the app is open, with 7 days of history fetched in one call. Each pull re-runs `whoopAdjustment`, and the planner re-plans only the meals not yet eaten. The code is already shaped for this: one snapshot in, the same rule on server and client, and `rebalance` touches only upcoming meals.

## Tests (done = all green)

0. **Setup:** `npm i -D playwright && npx playwright install chromium`. `public/mockup.html` is already committed. Start `npm run dev` in the background before the fixture step.
1. **Parity fixtures:** `scripts/mockup-fixtures.ts` (Playwright). Open `localhost:3000/mockup.html` (same DB menu). For each scenario, set `localStorage['hackro-demo-v9']`, reload, wait for the bootstrap (the console logs `[Hackro] Loaded … real menu items`, or give it 3 s if the API is down), then `page.evaluate` → `targets()`, `plan('sat')`, `plan('sun')` reduced to `{mealId, parts: [[name, m]], tot}`. Write the results to `tests/fixtures/`. Use the exact state shapes from `DEFAULT()` and the `A` handlers.
   - A: Build, male, 20, 5'10", 170 lb, 4 days, omnivore, snack on
   - B: Cut, female, 19, 5'5", 140 lb, 3 days, vegetarian + milk allergy
   - C: Maintain, halal + peanut + "mushroom" as the other allergy
   - D: A + breakfast fully eaten + lunch marked flex (use `A.flex`'s shape) → dinner rebalanced
   - Run with Whoop off, because the adjustment intentionally differs. Test Whoop separately in step 3.
2. **`scripts/test-planner.ts`:** build the same contexts, run `createPlanner`, and assert the same item names and multipliers per meal, kcal ±1 and targets equal. **Investigate any mismatch; don't re-tune to hide it.**
3. **Whoop rule:** for snapshots (strain 8 / 12 / 15.4 / 18; recovery 25 / 50 / 88), assert the kcal and protein deltas from the table, the +500 cap for Build, and no change when the permission is off.
4. **Update `scripts/test-solver.ts` and `.claude/skills/solver-test/SKILL.md`** to the planner's pass criteria. Drop "≤4 items, ≤2 servings, ±10% per meal".
   - Day kcal within ±3% of target, or `planStatus` reports the closest the menu allows.
   - Protein ≥ target − 0.5 g.
   - **Zero `conflict()` violations (hard FAIL).**
   - Eggs ≤ 1 per day, any dish ≤ 2 per day, no S/K-role items chosen as components.
   - Under 500 ms per day.
5. **Allergy test (CLAUDE.md):** a profile with a peanut allergy. Assert that no plate, alternative, swap candidate or augment-added dish contains a peanut-tagged item, across every meal slot. Do the same for an item with no allergen data and a milk allergy (fail closed).
6. Run `/demo-check`.

## Order of work (commit + `git pull` + push after each)

1. `planner/data`, `restrictions`, `items`, `targets` (with the Whoop rule) → typecheck.
2. `planner/plan` + `context` + `index`.
3. Fixtures + `test-planner` green.
4. `src/lib/targets.ts` wrapper, `recommend.ts` wrapper, `/api/plan`, the `/api/whoop` fallback. Update test-solver and its skill. Run `/demo-check`.
5. Remove the LP code and dependency. Add a line to `docs/DESIGN_DECISIONS.md`: *why we replaced the LP (plates weren't realistic, no day-level context, restriction bugs) and how the planner works (template ranking → greedy portion balancing → re-plan after eating; Whoop adjusts targets from real strain/recovery; pulled once for the demo, all-day refresh is Next steps).* The Background slide ("hardest part") and the AI-use slide draw from this.

Log each step in `docs/AI_LOG.md`, including how you checked it: fixture parity, Whoop rule tests, restriction test.
