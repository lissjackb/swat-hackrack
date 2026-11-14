---
name: add-api-route
description: Use when adding or changing a Next.js API route under src/app/api in Hackro (targets, menu, recommend, explain, log, whoop).
---

# Add an API route

1. **Read the docs first.** This is Next.js 16 and conventions changed: read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` before writing route code.
2. **Location:** `src/app/api/<name>/route.ts`. Export `GET` / `POST` functions that take a `Request`. API routes are Liss's lane; check before touching UI files under `src/app/(ui)`.
3. **Database:** import the shared Prisma client from `src/lib/db.ts` (create it once if missing). Never call `new PrismaClient()` inside a route. With the `prisma-client` generator, the client is imported from the generated output (`@/generated/prisma/client`), not from `@prisma/client`.
4. **Logic lives in `src/lib/`**, not in the route file: targets in `src/lib/targets.ts`, solver in `src/lib/recommend.ts`. The route only parses input, calls lib code, and returns.
5. **Responses:** return `Response.json(...)`. On failure, return a clear message plus a fallback (snapshot menu, last saved Whoop data, mock Whoop) rather than throwing. The demo must never show a raw error.
6. **Claude calls:** `claude-haiku-5-5` for plate explanations and dish matching, `claude-sonnet-5-5` only for the onboarding chat. Claude explains plates; it never computes macros or picks items. If `ANTHROPIC_API_KEY` is unset, return a plain template sentence instead.
7. **Copy and tone:** frame everything around fueling performance and hitting goals. No "good/bad food" language.
8. **Scope:** if the route isn't needed for the MVP list in `CLAUDE.md`, don't build it. Suggest it for "Next steps" instead.
