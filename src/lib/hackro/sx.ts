// sx("width:16px;height:16px") → { width: "16px", height: "16px" }.
// Lets every inline style string from the mockup carry over VERBATIM
// (PORT_PLAN rule 3: "the inline style inside the template strings counts as
// much as the class names"). Parsed once and cached per string.
import type { CSSProperties } from "react";

const cache = new Map<string, CSSProperties>();

export function sx(css: string): CSSProperties {
  let out = cache.get(css);
  if (out) return out;
  out = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith("--")
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    (out as Record<string, string>)[key] = value;
  }
  cache.set(css, out);
  return out;
}
