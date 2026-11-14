---
name: demo-check
description: Run before every git push, at each checkpoint (Fri midnight, Sat 10:30am, Sat 12:15pm freeze), and before recording the demo video. Confirms Hackro works end to end and no secrets are committed.
---

# Demo check

Run these in order. Stop at the first failure and report exactly what broke and the likely fix.

1. **Schema in sync:** `npx prisma db push` (also regenerates the client into `src/generated/prisma`).
2. **Snapshot fallback works:** run the scraper with the live source disabled (`MENU_URL= npm run scrape`, or however `scripts/scrape.ts` selects the snapshot). It must load `data/menu-snapshot.json` and save today's items. This is the demo's safety net, so it must pass even if the live scrape fails.
3. **Live scrape (optional):** `npm run scrape` with the real source. A failure here is acceptable only if step 2 passed. Say so in the report.
4. **Solver:** run the `solver-test` skill. All plates must PASS, and allergen filters must never be violated.
5. **Whoop mock:** confirm the mock toggle works without a live OAuth token (the demo must not depend on Whoop being up).
6. **Build:** `npm run build` with no errors.
7. **Secrets:** run `git status` and `git diff --cached`. FAIL if any of these are staged or tracked: `.env`, `.env.local`, `.env*`, `*.db`, `dev.db`, or strings that look like keys (`sk-ant-`, `WHOOP_CLIENT_SECRET=` with a value, `api_key=` with a value, long random tokens).
8. **AI log:** if this change was AI-assisted, check that a line was appended to `docs/AI_LOG.md` (`time | who | tool/model | what it did | how we checked it`). Remind the user if it's missing.

Finish with one line: **"Demo ready"** or **"Not ready: <reason>"**.

After the Sat 12:15pm feature freeze, also run the full demo path 3 times in a row (profile → recommended plate → "I ate this" → progress) and report any error.
