# Hackro: mockup → React + Tailwind port plan

**Source of truth:** `docs/mockup/hackro-mockup.html` (Liss + Griffy, Sat Nov 14).
**Goal:** a Next.js/React + Tailwind v4 app that looks and behaves the same as the mockup at 430 px wide, screen by screen.
Every Claude Code session doing the port reads this file first. Where this file or the mockup disagrees with `CLAUDE.md`: the mockup wins on layout, order and copy, and `CLAUDE.md` wins on safety (allergy rules, guardrails, tone).

## Rules for every session

1. **Translate the mockup. Don't redesign it.** Do NOT use the `frontend-design` skill for this work. Add no new colors, spacing, copy, icons, animations or layout ideas. If something in the mockup looks odd, copy it anyway and flag it in a comment.
2. **Use exact values.** When a mockup value isn't on Tailwind's default scale, use an arbitrary value (`text-[15px]`, `rounded-[24px]`, `gap-[14px]`, `h-[52px]`, `tracking-[1.3px]`, `leading-[1.04]`). Never round to the nearest Tailwind step.
3. **The inline `style="..."` inside the template strings counts as much as the class names.** Carry every inline style over.
4. **Copy every user-facing string exactly as written:** headings, labels, button text, empty states, toasts, aria-labels. The copy says "flex meal", never "cheat".
5. **Read only the line ranges you need** (map below). The file is about 190 KB, so don't read all of it.
6. **Port the engine logic exactly.** `targets`, `plan`, `balance`, `rebalance`, `completion` and the rest become pure TypeScript functions with the same inputs and the same outputs. Don't "improve" them.
7. **Stay in your own files** (see Lanes). If you need a primitive or a store action you don't own, stop and ask; don't add it yourself. Always `git pull` before `git push`, and stop if the pull produces conflicts.
8. **Check every screen against the mockup.** Screenshot the mockup and the React screen at 430×932 in the same state, list every difference, fix them, and screenshot again. A screen is done when you can't find a difference.
9. When a chunk of work is done, add one line to `docs/AI_LOG.md`.

## Setup (once)

- `public/mockup.html` (a committed copy of the mockup) serves it at `localhost:3000/mockup.html`, on the same origin and with the same `/api` data as the React app, so side-by-side screenshots match.
- The React store saves to the localStorage key `hackro-react-v1`. **Never** use `hackro-demo-v9`, which is the mockup's key and would collide with it.
- For screenshots, use the `webapp-testing` skill (Python Playwright: `pip install playwright && playwright install chromium`). If that's slow to set up, take the screenshots by hand and paste them into Claude Code.

## Mockup line map

| Lines | What's there | Becomes |
|---|---|---|
| 9–96 | CSS: tokens (line 10), base styles, component classes | `globals.css` + `ui.tsx` |
| 100–142 | SVG icon sprite (`i-home` … `i-trend`) | `Icon.tsx` |
| 154–392 | Data: MENU, THEMES, NUT, MEALS, DAYS, NOW, VENUES, GOALS, ALLERGENS, DEVICES, PERMS, REWARDS, QUICK, DEFAULT state (384), save (393) | `src/lib/planner/data.ts` (see PLANNER_SPEC.md) |
| 398–792 | Engine: menuFor, itemsFor, targets (457), rank, balance (544), plan (619), applySwaps, rebalance (685), slack, nextMeal, completion (709), qty/partText/dispName | `src/lib/planner/*` (see PLANNER_SPEC.md) |
| 719–777 | Visual helpers: concentric, ring, donut, legend, bar | `src/components/hackro/charts.tsx` |
| 793–843 | Claude: PROMPTS, callClaude (window.claude sampling, which is null in Next), aiTag, plateWhy, daySummary | `POST /api/ai` + `useAiText` hook |
| 844–860 | vLogin | screen |
| 861–936 | Onboarding: OB_STEPS, obValid, obErrors, numField, obHead, stepper, obBody, vOnboard | screen |
| 937–952 | vGen (generating) | screen |
| 953–986 | mealRow, howWeGot | `MealRow` component |
| 987–1009 | vReveal | screen |
| 1010–1049 | vConnect, sheetAuth, sheetSync, sheetSynced (wearable) | screen + sheets |
| 1050–1081 | swapCands, sheetISwap, needConfirm, logResults | sheet |
| 1082–1101 | sheetLog (menu / custom USDA log) | sheet |
| 1102–1120 | sheetFlex, sheetReward | sheets |
| 1121–1128 | tabs (5 tabs), topBack | `Tabs`, `TopBar` |
| 1129–1182 | vToday | screen |
| 1183–1203 | vPlan | screen |
| 1204–1235 | vMeal | pushed screen |
| 1236–1256 | vSwap | pushed screen |
| 1257–1289 | vFood | pushed screen |
| 1290–1308 | vFuel | pushed screen |
| 1309–1344 | vDining | screen |
| 1345–1406 | vTrack (this is the **Goals tab**) | screen |
| 1407–1448 | TODAY, goalPlan, goalPreview, goalText | engine (body-goal math) |
| 1449–1462 | vBodyGoal | pushed screen |
| 1463–1478 | vWeek | pushed screen |
| 1479–1504 | vYou | screen |
| 1505–1524 | vGoals (pushed from Track) | pushed screen |
| 1525–1545 | render(): the router | `page.tsx` shell |
| 1546–1679 | logEat, toast, runGen, enterApp, **`A` = every action handler** (`data-a="..."`) | store actions, same names |
| 1680–1801 | Real API bridge: menu bootstrap, createProfile, Whoop OAuth return, postLog | `src/lib/hackro/api.ts` |

## Navigation model (mirror the mockup)

- `S.view`: `login → ob → gen → reveal → connect → app`
- In `app`: `S.tab` is one of `today | plan | dining | goals | you`. `S.stack` holds pushed screens (`meal:<id>`, `swap:<id>`, `food:<name>`, `fuel`, `goals`, `week`, `bodygoal`). The top of the stack renders in place of the tab, and the tabs stay visible.
- `S.sheet`: `{type: auth | sync | synced | iswap | log | reward | flex}`, rendered in a layer with a backdrop. Clicking the backdrop closes it.
- The app column is `max-width: 430px`, centered, with 1 px side borders (`#121416`) and body `#050506` at ≥600 px.

## Tokens: mockup → `globals.css` names

| Mockup | Tailwind token | Value |
|---|---|---|
| --bg | background | #08090A |
| --s1 | surface | #141618 |
| --s2 | surface-2 | #1C1F22 |
| --line | line | #24282C |
| --tx | foreground | #F5F6F7 |
| --t2 | muted | #B4BAC1 |
| --t3 | muted-2 | #8C939B |
| --garnet / --garnet-t / --lime | same names | #A8233A / #E35D73 / #B8F135 |
| **add:** --amber, --orange, --blue, --violet, --green, --red, --fat | same names | #FFB020, #FF9432, #4DA3FF, #9B8CFF, #34D399, #FF5A5A, #C9CED4 |

Hard-coded hex values in the mockup (`#2C3036` toggle off, `#5A6068` radio ring, `#1F2226` skeleton, `#121416`, `#050506`) stay as arbitrary values.
**Fonts:** Inter (400–700) for body text, Barlow Condensed (500/600/700) for `.lbl`, `.h1`, `.n`, `.mt`, `.brand`. Load both with `next/font/google`. They replace Geist.

## Lanes

**Terminal A: Liss (logic and data)**
- Phase 1: `src/lib/hackro/state.ts` (types, pushed first), then the shared planner and Whoop work in **`docs/PLANNER_SPEC.md`** (`src/lib/planner/` is used by the server AND the React store, so don't write a separate `engine.ts`), then `store.tsx`, `api.ts`, `src/app/api/ai/route.ts`
- Phase 2 screens: Today, Plan, Meal, Swap, Food, Fuel, plus sheets `iswap`, `log`, `flex`

**Terminal B: Griffy (look and feel)**
- Phase 1: `layout.tsx` fonts, `globals.css` tokens + keyframes, `Icon.tsx`, `ui.tsx` primitives, `charts.tsx`, `MealRow.tsx`, app shell in `page.tsx` (tabs, stack, sheet layer, toast), `/primitives` preview route
- Phase 2 screens: Login, Onboarding, Gen, Reveal, Connect, plus sheets `auth`, `sync`, `synced`; Dining; Goals tab (vTrack), Goals, Week, BodyGoal; You; sheet `reward`

Each screen gets its own file in `src/components/hackro/screens/`. Only the owner edits `ui.tsx` and `store.tsx`; the other person asks for changes.
If Harlan is still working on the front end, tell him before either of us touches `src/components/hackro`.

## Checkpoints

- **Phase 1 done** (both foundations pushed): `/primitives` matches the mockup, and engine output matches the mockup for a test profile.
- **10:30am go/no-go:** the demo path (onboard → reveal → Today → meal → log → flex → dinner rebalances → Goals) is at parity in React. **If it isn't, demo the mockup at `/mockup.html`.** It already uses the real menu, log, profile and Whoop APIs. Move the React port to "Next steps".
- **12:15pm:** feature freeze. Run `/demo-check`.
