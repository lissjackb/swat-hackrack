// Shared UI primitives, ported from the mockup: cbox (715), aiTag (815),
// aBadge/ndBadge (1070–1071), xcNote (297–298), topBack (1125), the toast
// shell, onboarding field helpers (890–898).
import type { ReactNode } from "react";
import { sx } from "@/lib/hackro/sx";
import { XC } from "@/lib/planner";
import { Ic } from "./Icon";

export function Cbox({ state, onClick, label }: { state: boolean | "mixed"; onClick: () => void; label: string }) {
  const on = state === true, mixed = state === "mixed";
  return (
    <button onClick={onClick} role="checkbox" aria-checked={mixed ? "mixed" : on} aria-label={label}
      style={sx("width:44px;height:44px;margin:-10px -10px -10px 0;display:flex;align-items:center;justify-content:center;flex:none")}>
      <span style={{
        ...sx("width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#08090A"),
        background: on || mixed ? "var(--lime)" : "transparent",
        boxShadow: `inset 0 0 0 1.5px ${on || mixed ? "var(--lime)" : "#5A6068"}`,
      }}>
        {on ? <Ic i="i-check" s="width:14px;height:14px;stroke-width:3" /> : mixed ? <Ic i="i-minus" s="width:14px;height:14px;stroke-width:3" /> : null}
      </span>
    </button>
  );
}

export function AiTag({ label = "Claude" }: { label?: string }) {
  return (
    <span style={sx("display:inline-flex;align-items:center;gap:4px;font:600 11px Inter,sans-serif;letter-spacing:.3px;color:var(--t3);text-transform:uppercase")}>
      <Ic i="i-bolt" s="width:11px;height:11px" />{label}
    </span>
  );
}

export function ABadge({ hits }: { hits: string[] }) {
  if (!hits.length) return null;
  return (
    <span style={sx("display:inline-flex;align-items:center;gap:4px;font:600 12px Inter,sans-serif;color:var(--red);background:rgba(255,90,90,.12);padding:3px 8px;border-radius:999px;margin-top:4px")}>
      <Ic i="i-alert" s="width:12px;height:12px" />Contains {hits.join(", ")}
    </span>
  );
}

export function NdBadge() {
  return (
    <span style={sx("display:inline-block;font:600 12px Inter,sans-serif;color:var(--t2);background:#2C3036;padding:3px 8px;border-radius:999px;margin-top:4px")}>
      No allergen data
    </span>
  );
}

export function XcNote({ st = "" }: { st?: string }) {
  return <p className="note" style={sx(`margin:0;${st}`)}>{XC}</p>;
}

export function TopBack({ label, right, onBack }: { label: ReactNode; right?: ReactNode; onBack: () => void }) {
  return (
    <div className="top">
      <button className="ib" onClick={onBack} aria-label="Back"><Ic i="i-back" /></button>
      <span className="lbl">{label}</span>
      {right ?? <span />}
    </div>
  );
}

export function ObHead({ t, sub }: { t: string; sub?: string }) {
  return (
    <div className="g" style={sx("gap:8px")}>
      <h1 className="h1">{t}</h1>
      {sub ? <p className="sub">{sub}</p> : null}
    </div>
  );
}

export function NumField({ k, v, unit, ph, label, onChange }: {
  k: string; v: number | string; unit: string; ph: string; label: ReactNode;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="row" style={sx("height:52px;border-radius:16px;background:var(--s1);padding:0 16px;gap:8px")}>
        <input className="inp" style={sx("background:transparent;padding:0;height:50px;flex:1;min-width:0;box-shadow:none")}
          type="number" inputMode="numeric" value={v ?? ""} placeholder={ph}
          onChange={(e) => onChange(k, e.target.value)} />
        <span className="u">{unit}</span>
      </div>
    </label>
  );
}

export function Spinner({ size = 14, stroke = "#B4BAC1", track = "#2C3036", width = 3 }: { size?: number; stroke?: string; track?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke={track} strokeWidth={width} />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" />
    </svg>
  );
}
