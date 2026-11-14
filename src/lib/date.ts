// Local-time YYYY-MM-DD. One convention everywhere: menu/whoop/log dates are
// LOCAL Swarthmore days, so "today" must be computed in local time, not UTC
// (toISOString() can roll a day in a US timezone). See src/lib/progress.ts.
export function localYmd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
