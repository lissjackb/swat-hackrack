"use client";
// Small shared UI primitives for the Hackro app. Clean/minimal Tailwind — the
// pixel-faithful styling comes later.
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-surface p-4 ${className}`}>{children}</div>
  );
}

export function Btn({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "chip" }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: "h-13 w-full rounded-2xl bg-garnet text-white hover:brightness-110 px-5 py-3.5",
    ghost: "h-12 w-full rounded-2xl bg-surface text-foreground hover:bg-surface-2 px-5",
    chip: "h-9 rounded-full px-3.5 text-sm",
  }[variant];
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Chip({
  on,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`h-9 rounded-full px-3.5 text-sm font-semibold transition ${
        on ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-2"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-13 w-full rounded-2xl bg-surface px-4 text-base outline-none placeholder:text-muted-2 focus:ring-1 focus:ring-muted-2 ${props.className ?? ""}`}
    />
  );
}

/** A horizontal macro progress bar: eaten vs target. */
export function MacroBar({
  label,
  eaten,
  target,
  unit = "g",
  color = "var(--lime)",
}: {
  label: string;
  eaten: number;
  target: number;
  unit?: string;
  color?: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((eaten / target) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold text-foreground">{Math.round(eaten)}</span>
          <span className="text-muted-2">
            {" "}
            / {Math.round(target)}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
