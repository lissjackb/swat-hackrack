// One planner, used by server AND client (docs/PLANNER_SPEC.md). Pure
// TypeScript: no React, Next, Prisma, window or localStorage imports anywhere
// under src/lib/planner/. The API routes and the React store import this same
// module, so server numbers always equal what's on screen.
//
//   const planner = createPlanner(dbRows, ctx);
//   planner.targets(); planner.plan('sat'); planner.planStatus('sun'); …
//
// Caches live inside each createPlanner closure (never module-level — the
// server would share them across users).
export * from "./data";
export * from "./context";
export * from "./restrictions";
export * from "./items";
export * from "./targets";
export * from "./plan";

import { fromMenuItems, builtinMenus, type MenuData, type MenuItemRowLike } from "./items";
import { createEngine, type PlanEngine } from "./plan";
import { normalizeContext, type PlanContext, type PlannerProfile } from "./context";

export type Planner = PlanEngine;

/**
 * Build a planner over DB menu rows (or an already-built MenuData) for one
 * immutable context. Rows that don't map to a demo meal slot are ignored;
 * empty slots fall back to the built-in mockup menu.
 */
export function createPlanner(
  items: MenuItemRowLike[] | MenuData | null | undefined,
  ctx: Partial<PlanContext> & { p: PlannerProfile },
): Planner {
  const menus: MenuData = !items
    ? builtinMenus()
    : Array.isArray(items)
      ? fromMenuItems(items)
      : items;
  return createEngine(menus, normalizeContext(ctx));
}
