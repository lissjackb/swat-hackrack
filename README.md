# Hackro (repo: HackRack)

Tells a Tri-Co student what to put on their plate _before_ they walk into the
dining hall — matches today's real Swarthmore Dining Center menu to their macro
goals (and optional Whoop recovery), then tracks what they actually ate.

See **[CLAUDE.md](./CLAUDE.md)** for scope, MVP, team lanes, and checkpoints.

## Stack

Next.js (App Router) · TypeScript · Prisma + SQLite · `javascript-lp-solver` ·
Anthropic SDK · Tailwind.

## Setup

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (+ WHOOP_* for live mode)
npm run db:push              # create dev.db from prisma/schema.prisma
npm run seed                 # load menu snapshot + demo profile + week history
npm run dev                  # http://localhost:3000
```

`DATABASE_URL` is already set in `.env` (non-secret). Secrets go in `.env.local`.

## Layout

```
prisma/schema.prisma   data model (Profile, MenuItem, LogEntry, WhoopDay)
data/menu-snapshot.json demo fallback menu (replace with today's real menu)
scripts/
  scrape.ts            menu -> SQLite (live endpoint, falls back to snapshot)
  seed.ts              demo profile, mock Whoop day, seeded week history
src/
  lib/                 shared logic (Liss)
    types.ts           cross-boundary types (source of truth)
    db.ts              Prisma client singleton
    targets.ts         Mifflin-St Jeor -> daily & per-meal targets
    recommend.ts       LP plate recommender + hard restriction filter
    claude.ts          "why this plate" note (Claude, with fallback)
  app/
    api/               route handlers (Liss)
      targets/         POST profile -> macro targets
      menu/            GET menu items
      recommend/       POST -> recommended plate + note
      log/             POST "I ate this" / GET day progress
      whoop/           GET recovery+strain (mock toggle)
    (ui)/              screens (Harlan) — route group, still serves "/"
  components/          React components (Harlan)
```

## Scripts

| command             | what it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | dev server                                    |
| `npm run scrape`    | load today's menu into the DB (live/snapshot) |
| `npm run seed`      | scrape + seed demo profile/Whoop/history      |
| `npm run db:push`   | sync schema to `dev.db`                        |
| `npm run db:studio` | browse the DB                                 |
| `npm run typecheck` | `tsc --noEmit`                                |
