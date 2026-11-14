# Mockup parity fixtures

Captured from the REAL mockup engine (`public/mockup.html` served at
`localhost:3000/mockup.html`, bootstrapped from the same enriched DB via
`/api/menu`) on Sat Nov 14, per PLANNER_SPEC "Tests" step 1: for each
scenario, set `localStorage['hackro-demo-v9']` to the DEFAULT()-shaped state,
reload, wait for the `[Hackro] Loaded … real menu items` bootstrap, then
evaluate `targets()`, `plan('sat')`, `plan('sun')` reduced to
`{mealId, parts: [[name, m]], tot}`.

Captured with Claude-in-Chrome page scripting instead of the spec's
Playwright script (`npm i -D playwright` was blocked in the session that
built this). The capture recipe above is exactly what a
`scripts/mockup-fixtures.ts` Playwright port should do if these need
regenerating — note that fixtures depend on the enriched DB contents, so
re-scraping/re-enriching the demo dates invalidates them.

- A: Build, male, 20, 5'10", 170 lb, 4 days, omnivore, snack on
- B: Cut, female, 19, 5'5", 140 lb, 3 days, vegetarian + milk allergy
- C: Maintain, halal + peanut + "mushroom" other allergy (A's body stats, 3 days)
- D: A + breakfast fully eaten (`ate` key) + lunch flex {k:800,p:20,c:110,f:30}

`scripts/test-planner.ts` asserts the TS planner reproduces these exactly
(same items and multipliers, kcal ±1, targets equal). Whoop is OFF in all
four (the adjustment intentionally differs; it's tested separately).
