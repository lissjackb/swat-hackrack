---
name: solver-test
description: Use after any change to src/lib/targets.ts, src/lib/recommend.ts, menu filtering, or the Whoop target adjustment, to verify Hackro's plates still hit macro targets and never violate restrictions.
---

# Solver test

Run `npx tsx scripts/test-solver.ts`. If the script doesn't exist yet, create it: it should load `data/menu-snapshot.json` (no database needed) and build breakfast, lunch and dinner plates for each profile below.

Test profiles:
- **Build:** male, 20, 183 cm, 82 kg, very active (athlete)
- **Cut:** male, 19, 175 cm, 85 kg, moderate
- **Maintain, vegetarian:** female, 20, 165 cm, 57 kg, active
- **Perform, vegan, peanut + tree nut allergy:** female, 21, 170 cm, 63 kg, light
- **Whoop adjustment:** the Build profile again with high strain, then with red recovery, to confirm targets shift in the expected direction

Pass criteria for every plate:
- Calories and protein within 10% of the meal targets
- **Hard constraint:** no item that breaks the profile's diet or allergen list. One violation = overall FAIL, whatever else passes.
- At most 4 distinct items, at most 2 servings each
- Solves in under 500 ms

Print a table of target vs. actual per plate (kcal, protein, carbs, fat), then an overall **PASS** or **FAIL**.

If a plate misses, first check whether the menu simply can't reach the target (for example, a vegan menu with little protein) before changing solver weights. Report that case rather than forcing it.
