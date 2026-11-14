// Visual helpers, ported from the mockup (lines 719–776): concentric rings,
// ring, macro donut, legend, bar. Same sizes, strokes, gaps and colors.
import type { ReactNode } from "react";
import { sx } from "@/lib/hackro/sx";
import { fmt, type MacroSum } from "@/lib/planner";

export type ConcentricRow = [string, number, number, string, string?, string?];

export function Concentric({ list, size = 248, sw = 14, gap = 4 }: { list: ConcentricRow[]; size?: number; sw?: number; gap?: number }) {
  const c = size / 2;
  const out: ReactNode[] = [];
  list.forEach(([, v, max, col, , overCol], i) => {
    const r = c - sw / 2 - i * (sw + gap);
    const pc = Math.min(100, (v / max) * 100);
    const op = overCol && v > max ? Math.min(100, ((v - max) / max) * 100) : 0;
    out.push(<circle key={`b${i}`} cx={c} cy={c} r={r} fill="none" stroke={col} strokeOpacity=".16" strokeWidth={sw} />);
    if (pc > 0.5) out.push(
      <circle key={`f${i}`} cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"
        pathLength={100} strokeDasharray={`${pc.toFixed(1)} 100`} transform={`rotate(-90 ${c} ${c})`}
        style={sx("transition:stroke-dasharray .6s ease")} />,
    );
    if (op > 0.5) out.push(
      <circle key={`o${i}`} cx={c} cy={c} r={r} fill="none" stroke={overCol} strokeWidth={sw} strokeLinecap="round"
        pathLength={100} strokeDasharray={`${op.toFixed(1)} 100`} transform={`rotate(-90 ${c} ${c})`} />,
    );
  });
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">{out}</svg>;
}

export function Ring({ size, sw, pct, color, inner, label }: { size: number; sw: number; pct: number; color: string; inner: ReactNode; label?: string }) {
  const r = (size - sw) / 2;
  const c = size / 2;
  return (
    <div style={sx(`position:relative;width:${size}px;height:${size}px;flex:none`)} role={label ? "img" : undefined} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#1C1F22" strokeWidth={sw} />
        {pct > 0 && (
          <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
            pathLength={100} strokeDasharray={`${Math.min(pct, 100).toFixed(1)} 100`} transform={`rotate(-90 ${c} ${c})`}
            style={sx("transition:stroke-dasharray .6s ease")} />
        )}
      </svg>
      <div style={sx("position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center")}>{inner}</div>
    </div>
  );
}

export function Donut({ t, size = 148 }: { t: MacroSum; size?: number }) {
  const pk = t.p * 4, ck = t.c * 4, fk = t.f * 9, tot = pk + ck + fk || 1;
  const gap = 1.5;
  const pp = (pk / tot) * 100, cp = (ck / tot) * 100, fp = (fk / tot) * 100;
  const r = size / 2 - 8;
  const c = size / 2;
  const seg = (v: number, off: number, col: string, key: string) =>
    v > gap ? (
      <circle key={key} cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={14} pathLength={100}
        strokeDasharray={`${(v - gap).toFixed(2)} 100`} strokeDashoffset={(-off).toFixed(2)} />
    ) : null;
  return (
    <div style={sx(`position:relative;width:${size}px;height:${size}px;flex:none`)} role="img"
      aria-label={`Protein ${Math.round(t.p)} g, carbs ${Math.round(t.c)} g, fat ${Math.round(t.f)} g`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#1C1F22" strokeWidth={14} />
          {seg(pp, 0, "#B8F135", "p")}
          {seg(cp, pp, "#FF9432", "c")}
          {seg(fp, pp + cp, "#C9CED4", "f")}
        </g>
      </svg>
      <div style={sx("position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px")}>
        <span className="n" style={sx("font-size:40px")}>{fmt(t.k)}</span>
        <span className="u">kcal</span>
      </div>
    </div>
  );
}

export function Legend({ t }: { t: { p: number; c: number; f: number } }) {
  const row = (col: string, l: string, v: number) => (
    <div key={l} className="row" style={sx("gap:8px")}>
      <span style={sx(`width:8px;height:8px;border-radius:2px;background:${col}`)} />
      <span className="t2" style={sx("flex:1")}>{l}</span>
      <span className="n" style={sx("font-size:22px")}>{Math.round(v)}<span className="u"> g</span></span>
    </div>
  );
  return (
    <div className="g" style={sx("gap:14px;flex:1")}>
      {row("#B8F135", "Protein", t.p)}
      {row("#FF9432", "Carbs", t.c)}
      {row("#C9CED4", "Fat", t.f)}
    </div>
  );
}

export function Bar({ label, v, max, col, unit = "" }: { label: string; v: number; max: number; col: string; unit?: string }) {
  return (
    <div className="g" style={sx("gap:8px")}>
      <div className="row sb">
        <span style={sx("font-weight:500")}>{label}</span>
        <span><span className="n" style={sx("font-size:20px")}>{fmt(v)}</span><span className="u"> / {fmt(max)}{unit}</span></span>
      </div>
      <div className="tr"><div className="fl" style={sx(`width:${Math.min(100, (v / max) * 100).toFixed(1)}%;background:${col}`)} /></div>
    </div>
  );
}
