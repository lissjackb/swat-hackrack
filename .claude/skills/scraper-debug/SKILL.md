---
name: scraper-debug
description: Use when Hackro's menu scraper fails, returns 0 items, returns items without nutrition, or the Swarthmore Dining Center menu page changes.
---

# Scraper debug

Source: `dash.swarthmore.edu/menu/dining-center/` (a Gatsby/React page). Per-item nutrition probably lives in CBORD NetNutrition (`netnutrition.cbord.com/nn-prod/swarthmore`).

1. **Expect client-side rendering.** The menu loads with JavaScript, so fetching the HTML and parsing it with Cheerio will likely return 0 items. That's not a selector bug.
2. **Find the JSON request.** Ask the user to open the page in Chrome DevTools → Network → Fetch/XHR, reload, and share the request URL and a sample response. Call that endpoint directly from `scripts/scrape.ts`.
3. **Nutrition.** If the menu JSON has no macros, check NetNutrition for per-item calories, protein, carbs and fat before using a separate nutrition API.
4. **Labels.** Map the page's dietary and allergen labels (Vegan, Vegetarian, Gluten Free, Halal, Kosher, Milk, Egg, Peanut, Tree Nut, Soy, Sesame, Shellfish, Fish, Wheat, Pork, Alcohol, and others) into each item's tags and allergens. The solver's restriction filters depend on these.
5. **Verify.** Re-run `npm run scrape`, confirm a reasonable item count (20+ for the day), and spot-check 5 items' names, stations and macros against the live site or NetNutrition. Log the check in `docs/AI_LOG.md`.
6. **Never delete or weaken the snapshot fallback** (`data/menu-snapshot.json`).
7. **Time box.** If the live scrape isn't working by **Fri 11:30pm**, stop. Freeze on `menu-snapshot.json` (today's real menu captured by hand) and move on. A live scraper doesn't win points.
