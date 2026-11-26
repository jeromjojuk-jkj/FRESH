"use client";
import { useEffect, useRef } from "react";
import { IconAlert, IconMinus, IconPlus, IconRefresh, IconX } from "./icons";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "md" | "lg"; busy?: boolean };

export function Button({ variant = "primary", size = "md", busy, className = "", children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-[#A6DDB4]",
    secondary: "bg-white text-brand border-2 border-brand hover:bg-mint disabled:opacity-50",
    ghost: "bg-transparent text-brand hover:bg-mint",
    danger: "bg-white text-danger border-2 border-danger hover:bg-danger-bg",
  }[variant];
  const s = size === "lg" ? "min-h-14 px-6 text-base" : "min-h-12 px-4 text-[15px]";
  return (
    <button {...rest} disabled={disabled || busy} aria-busy={busy || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors duration-150 ${v} ${s} ${className}`}>
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}

/** Same footprint as the Add button so the control doesn't jump after adding. */
export function QtyStepper({ qty, onChange, max, label, size = "md" }: { qty: number; onChange: (n: number) => void; max?: number; label: string; size?: "md" | "lg" }) {
  const h = size === "lg" ? "h-12" : "h-11";
  const atMax = max !== undefined && qty >= max;
  return (
    <div className={`flex ${h} w-full items-stretch overflow-hidden rounded-xl bg-brand text-white`} role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" onClick={() => onChange(qty - 1)} className="grid w-11 shrink-0 place-items-center hover:bg-brand-dark" aria-label={qty === 1 ? `Remove ${label}` : `Decrease ${label}`}>
        <IconMinus />
      </button>
      <output className="grid flex-1 place-items-center text-base font-semibold" aria-live="polite">{qty}</output>
      <button type="button" onClick={() => onChange(qty + 1)} disabled={atMax} className="grid w-11 shrink-0 place-items-center hover:bg-brand-dark disabled:opacity-40" aria-label={atMax ? `No more ${label} in stock` : `Increase ${label}`}>
        <IconPlus />
      </button>
    </div>
  );
}

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="fade-in relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="-m-2 grid h-11 w-11 place-items-center rounded-full hover:bg-mint" aria-label="Close"><IconX /></button>
        </div>
        {children}
        {footer ? <div className="mt-5 flex flex-col gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry, compact }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-bg text-danger ${compact ? "p-3" : "p-4"}`}>
      <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm font-medium">{message}</div>
      {onRetry ? (
        <button onClick={onRetry} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-white px-3 text-sm font-semibold text-danger ring-1 ring-danger/40 hover:bg-danger-bg">
          <IconRefresh className="h-4 w-4" /> Retry
        </button>
      ) : null}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn"; children: React.ReactNode }) {
  return <div className={`rounded-2xl p-3 text-sm ${tone === "warn" ? "bg-warn-bg text-warn" : "bg-mint text-ink"}`}>{children}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-mint ${className}`} aria-hidden />;
}

export function DemoTag({ children = "Demo" }: { children?: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-dashed border-brand bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">{children}</span>;
}

export function Field({ label, hint, children, id }: { label: string; hint?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      {children}
      {hint ? <p className="text-xs text-ink-2" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}

export const inputCls = "min-h-12 w-full rounded-xl border-2 border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-[#5B6B60] focus:border-brand focus:outline-none";
