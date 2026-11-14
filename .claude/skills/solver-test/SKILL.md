---
name: solver-test
description: Use after any change to src/lib/planner/, src/lib/targets.ts, src/lib/recommend.ts, menu filtering, or the Whoop target adjustment, to verify Hackro's day plans still hit macro targets and never violate restrictions.
---

# Planner test

Run `npx tsx scripts/test-solver.ts` (skill profiles, DB menu) and
`npx tsx scripts/test-planner.ts` (PLANNER_SPEC contexts A–D, Whoop rule,
allergy fail-closed). Both read the enriched DB for the demo dates
(2026-11-14 / 2026-11-15) and fall back to the built-in mockup menu for any
empty slot.

Test profiles (test-solver):
- **Build:** male, 20, 183 cm, 82 kg, very active (athlete)
- **Cut:** male, 19, 175 cm, 85 kg, moderate
- **Maintain, vegetarian:** female, 20, 165 cm, 57 kg, active
- **Perform, vegan, peanut + tree nut allergy:** female, 21, 170 cm, 63 kg, light
- **Whoop adjustment:** the Build profile with high strain (expect exactly
  +150 kcal, into carbs) and with red recovery (expect protein × 1.1)

Pass criteria for every planned DAY (the planner plans whole days, not
isolated plates):
- Day calories within ±3% of target, **or** `planStatus` reports the closest
  the menu allows (a reported miss is a LIMIT, not a FAIL)
- Protein ≥ target − 0.5 g (same reporting escape hatch)
- **Hard constraint:** zero `conflict()` violations — no plate part, ranked
  alternative or augment-added dish may break the profile's diet or allergen
  list. One violation = overall FAIL, whatever else passes.
- Eggs in at most 1 meal per day unless the filtered menu forces it
  (first-fit cap, see the note in scripts/test-planner.ts), any dish ≤ 2 per
  day, and no S (sweet) / K (condiment) role items chosen as plate components
- Each day plans in under 500 ms

Print target vs. actual per day (kcal, protein, carbs, fat), then an overall
**PASS** or **FAIL**.

If a day misses, first check whether the menu simply can't reach the target
(for example, a vegan menu with little protein) before changing planner
logic — `planStatus().msg` should already be reporting it. Report that case
rather than forcing it. **Never re-tune the ported mockup logic to hide a
mismatch** (docs/PLANNER_SPEC.md).
