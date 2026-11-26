"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { useApi, useNow } from "@/lib/client/hooks";
import { ago, timeIST } from "@/lib/format";
import { rupees } from "@/lib/money";
import { formatKm } from "@/lib/geo";
import { ErrorBox, Skeleton } from "@/components/ui";
import { RouteMotif } from "@/components/RouteMotif";
import { IconCheck, IconChevron, IconNav, IconPhone, IconScooter } from "@/components/icons";

/*
 * Rider screen. Its own look, apart from the shop: a deep forest header with a
 * champagne-gold accent, "trip ticket" cards joined by the green route line, and
 * slide-to-confirm so a pocket tap never marks an order picked up or delivered.
 */

type Me = { role: string; id: string; name: string };
type Delivery = {
  code: string; status: string; statusLabel: string; address: any; lat: number; lng: number; total: number;
  paymentMethod: string; paymentStatus: string; storeName: string; storeAddress: string; storeLat: number; storeLng: number;
  storePhone: string; customerName: string; customerPhone: string; itemCount: number; distanceM: number; deliveredAt: string | null; tip: number;
};
const navUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`;
const GOLD = "#E2B65C";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function RiderPage() {
  const me = useApi<Me>("/me");
  if (me.error) return <div className="p-4"><ErrorBox message={me.error.message} onRetry={me.reload} /></div>;
  if (!me.data) return <div className="min-h-dvh bg-[#0E1A13] p-4"><Skeleton className="h-40 opacity-20" /></div>;
  if (me.data.role !== "rider") return <RiderSignIn />;
  return <RiderHome />;
}

function RiderHome() {
  const { data, error, reload } = useApi<{ rider: any; deliveries: Delivery[] }>("/rider/deliveries", { pollMs: 5000 });
  const now = useNow(10000);
  const all = data?.deliveries ?? [];
  const active = all.filter((d) => d.status !== "delivered");
  const done = all.filter((d) => d.status === "delivered");
  const onRoad = active.find((d) => d.status === "out_for_delivery") ?? active.find((d) => d.status === "ready");
  const cash = active.filter((d) => d.paymentMethod === "cod" && d.paymentStatus !== "paid").reduce((n, d) => n + d.total, 0);
  const name: string = data?.rider?.name ?? "Partner";
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh bg-[#F3F5F2] pb-12">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-b-[32px] bg-[#0E1A13] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(46,190,90,.45),transparent_65%)]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(226,182,92,.18),transparent_65%)]" aria-hidden />
        <div className="relative mx-auto max-w-xl space-y-5 px-5 pb-7 pt-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#16271D] text-base font-bold tracking-wide" style={{ boxShadow: `0 0 0 2px ${GOLD}` }}>{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/60">{greeting()},</p>
              <p className="truncate text-lg font-semibold">{name}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3FCB63] opacity-60 motion-reduce:animate-none" /><span className="relative h-2.5 w-2.5 rounded-full bg-[#3FCB63]" /></span>
              On duty
            </span>
          </div>
          <p className="flex items-center gap-2 text-[13px] text-white/60"><IconScooter className="h-4 w-4" />{data?.rider?.vehicle ?? "—"}</p>
          <dl className="grid grid-cols-3 gap-2.5">
            {[
              ["Active", String(active.length)],
              ["Delivered today", String(done.length)],
              ["Cash to collect", cash ? rupees(cash) : "₹0"],
            ].map(([k, v], i) => (
              <div key={k} className="min-w-0 rounded-2xl border border-white/10 bg-white/[.06] px-3 py-3 backdrop-blur">
                <dd className="truncate text-[22px] font-semibold leading-none tabular-nums" style={i === 2 && cash ? { color: GOLD } : undefined}>{v}</dd>
                <dt className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[.08em] text-white/55">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-xl space-y-6 px-4 pt-5">
        {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
        {onRoad ? <LiveCard delivery={onRoad} sharing={!!data?.rider?.sharing} lastAt={data?.rider?.locationAt} now={now} onChange={reload} /> : null}

        <section aria-labelledby="trips" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h1 id="trips" className="text-[11px] font-bold uppercase tracking-[.14em] text-ink-2">Your trips</h1>
            <span className="text-xs text-ink-2">{active.length ? `${active.length} assigned` : ""}</span>
          </div>
          {!data ? <Skeleton className="h-64" /> : active.length === 0 ? (
            <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_10px_30px_-20px_rgba(14,26,19,.5)]">
              <RouteMotif className="mx-auto w-48" progress={0.5} labels={false} />
              <p className="mt-3 text-base font-semibold">No trips right now</p>
              <p className="mt-1 text-sm text-ink-2">New pickups appear here as soon as a store accepts an order. Location sharing stays off until then.</p>
            </div>
          ) : (
            <ul className="space-y-4">{active.map((d) => <TripCard key={d.code} d={d} onChange={reload} />)}</ul>
          )}
        </section>

        {done.length ? (
          <section aria-labelledby="done" className="space-y-2">
            <h2 id="done" className="text-[11px] font-bold uppercase tracking-[.14em] text-ink-2">Completed today</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-white shadow-[0_10px_30px_-22px_rgba(14,26,19,.5)]">
              {done.map((d) => (
                <li key={d.code} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-brand"><IconCheck className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><b className="font-semibold">{d.code}</b> · <span className="text-ink-2">{d.storeName}</span></span>
                  <span className="text-xs text-ink-2">{d.deliveredAt ? timeIST(d.deliveredAt) : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="pt-2 text-center"><Link href="/demo" className="inline-flex min-h-11 items-center rounded-full border border-dashed border-brand px-4 text-xs font-semibold uppercase tracking-wide text-brand">Demo switcher</Link></p>
      </main>
    </div>
  );
}

/** One delivery as a ticket: pickup and drop joined by the route line, then a slide-to-confirm. */
function TripCard({ d, onChange }: { d: Delivery; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const a = d.address;
  const picked = d.status === "out_for_delivery";
  const ready = d.status === "ready";
  const collect = d.paymentMethod === "cod" && d.paymentStatus !== "paid";
  const act = async (action: "pickup" | "deliver") => {
    setBusy(true); setErr(null);
    try { await api(`/rider/orders/${d.code}`, { method: "POST", json: { action } }); onChange(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const stages = ["accepted", "packing", "ready"];
  const stageIdx = stages.indexOf(d.status);

  return (
    <li className="overflow-hidden rounded-[28px] bg-white shadow-[0_14px_40px_-24px_rgba(14,26,19,.55)]">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-ink-2">Order</p>
          <p className="text-xl font-bold tracking-tight">{d.code}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${picked ? "bg-[#0E1A13] text-white" : ready ? "bg-mint text-brand" : "bg-[#F3F5F2] text-ink-2"}`}>{d.statusLabel}</span>
      </div>

      {/* Journey */}
      <div className="relative px-5">
        <span className="absolute bottom-[52px] left-[33px] top-[26px] w-0.5 bg-[repeating-linear-gradient(to_bottom,#22B24C_0_6px,transparent_6px_12px)]" aria-hidden />
        <div className="flex gap-3 pb-4">
          <span className={`relative z-10 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ${picked ? "bg-brand text-white" : "border-2 border-brand bg-white"}`}>{picked ? <IconCheck className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-brand" />}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-ink-2">Pickup</p>
            <p className="font-semibold">{d.storeName}</p>
            <p className="text-sm text-ink-2">{d.storeAddress}</p>
          </div>
          {!picked ? <NavButton href={navUrl(d.storeLat, d.storeLng)} label={`Navigate to ${d.storeName}`} /> : null}
        </div>
        <div className="flex gap-3 pb-4">
          <span className="relative z-10 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0E1A13] text-white"><span className="h-2 w-2 rounded-sm bg-white" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-ink-2">Drop · {formatKm(d.distanceM)}</p>
            <p className="font-semibold">{[a.flat, a.floor && `${a.floor} floor`].filter(Boolean).join(", ") || "Customer"}{d.customerName && d.customerName !== "Guest" ? <span className="font-normal text-ink-2"> · {d.customerName}</span> : null}</p>
            <p className="text-sm text-ink-2">{a.line}</p>
            {a.landmark ? <p className="text-sm text-ink-2">Landmark: {a.landmark}</p> : null}
            {a.instructions ? <p className="mt-1.5 inline-block rounded-xl bg-[#FBF4E4] px-2.5 py-1 text-[13px] text-[#6B4E14]">“{a.instructions}”</p> : null}
          </div>
          {picked ? <NavButton href={navUrl(d.lat, d.lng)} label="Navigate to the customer" primary /> : null}
        </div>
      </div>

      {/* Ticket perforation */}
      <div className="relative h-5" aria-hidden>
        <span className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-[#F3F5F2]" />
        <span className="absolute -right-2.5 top-0 h-5 w-5 rounded-full bg-[#F3F5F2]" />
        <span className="absolute inset-x-5 top-1/2 border-t border-dashed border-line" />
      </div>

      <div className="space-y-3 px-5 pb-5 pt-2">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-ink-2">{collect ? "Collect at door" : "Payment"}</p>
            <p className="text-lg font-bold tabular-nums" style={collect ? { color: "#9A7425" } : undefined}>{collect ? rupees(d.total) : "Paid online"}<span className="ml-2 text-sm font-medium text-ink-2">· {d.itemCount} item{d.itemCount === 1 ? "" : "s"}</span></p>
            {d.tip ? <p className="mt-0.5 text-sm font-semibold text-brand">+ {rupees(d.tip)} tip for you</p> : null}
          </div>
          {(d.customerPhone || a.phone) ? (
            <a href={`tel:${String(d.customerPhone || a.phone).replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold text-ink hover:bg-[#F3F5F2]">
              <IconPhone className="h-4 w-4 text-brand" /> Call
            </a>
          ) : null}
        </div>
        {err ? <ErrorBox compact message={err} /> : null}
        {picked ? (
          <SwipeConfirm label="Slide to confirm delivery" busy={busy} onConfirm={() => act("deliver")} testId={`deliver-${d.code}`} dark />
        ) : ready ? (
          <SwipeConfirm label="Slide to confirm pickup" busy={busy} onConfirm={() => act("pickup")} testId={`pickup-${d.code}`} />
        ) : (
          <div className="rounded-2xl bg-[#F3F5F2] p-3" role="status">
            <div className="mb-2 flex justify-between text-xs font-semibold"><span>{d.status === "packing" ? "Store is packing" : "Store has accepted"}</span><span className="text-ink-2">Pickup unlocks when ready</span></div>
            <div className="grid grid-cols-3 gap-1.5" aria-hidden>{stages.map((s, i) => <span key={s} className={`h-1.5 rounded-full ${i <= stageIdx ? "bg-brand" : "bg-line"}`} />)}</div>
            <button type="button" disabled data-testid={`pickup-${d.code}`} className="sr-only">Confirm pickup (not ready yet)</button>
          </div>
        )}
      </div>
    </li>
  );
}

function NavButton({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label}
      className={`inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-full px-3.5 text-sm font-semibold ${primary ? "bg-[#0E1A13] text-white" : "border border-line text-ink hover:bg-[#F3F5F2]"}`}>
      <IconNav className="h-4 w-4" /> Go
    </a>
  );
}

/**
 * Slide-to-confirm. Drag the handle to the end to confirm. A plain tap only shows a hint,
 * so a pocket tap can't confirm. Keyboard users press Enter or Space on the handle.
 */
function SwipeConfirm({ label, onConfirm, busy, testId, dark }: { label: string; onConfirm: () => void; busy: boolean; testId: string; dark?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ startX: number; max: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const [x, setX] = useState(0);
  const [hint, setHint] = useState(false);
  const max = () => (track.current && knob.current ? track.current.clientWidth - knob.current.clientWidth - 8 : 200);
  useEffect(() => { if (!busy) setX(0); }, [busy]);

  return (
    <div ref={track} className={`relative h-[60px] select-none overflow-hidden rounded-full ${dark ? "bg-[#0E1A13] text-white" : "bg-mint text-brand"}`}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-brand/25" style={{ width: x + 56 }} aria-hidden />
      <span className={`pointer-events-none absolute inset-0 grid place-items-center pl-12 text-[15px] font-semibold ${dark ? "text-white/90" : ""}`} aria-hidden>
        {busy ? "Confirming…" : hint ? "Slide the button all the way →" : label}
      </span>
      <button
        ref={knob}
        type="button"
        data-testid={testId}
        aria-label={`${label}. Press Enter to confirm.`}
        disabled={busy}
        className="absolute left-1 top-1 grid h-[52px] w-[52px] touch-none place-items-center rounded-full bg-brand text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)] transition-transform"
        style={{ transform: `translateX(${x}px)`, transitionDuration: drag.current ? "0ms" : "200ms" }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { startX: e.clientX - x, max: max(), moved: false }; }}
        onPointerMove={(e) => { const dr = drag.current; if (!dr) return; const nx = Math.min(dr.max, Math.max(0, e.clientX - dr.startX)); if (Math.abs(nx - x) > 3) dr.moved = true; setX(nx); }}
        onPointerUp={() => { const dr = drag.current; drag.current = null; if (!dr) return; dragged.current = dr.moved; if (x >= dr.max * 0.85) { setX(dr.max); onConfirm(); } else setX(0); }}
        onPointerCancel={() => { drag.current = null; setX(0); }}
        onClick={(e) => {
          if (e.detail === 0) { onConfirm(); return; } // keyboard activation
          if (dragged.current) { dragged.current = false; return; }
          setHint(true); setTimeout(() => setHint(false), 1800);
        }}
      >
        {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <IconChevron className="h-6 w-6" />}
      </button>
    </div>
  );
}

/** Live location for the trip in hand: shares GPS only during the delivery; includes a demo simulator. */
function LiveCard({ delivery, sharing, lastAt, now, onChange }: { delivery: Delivery; sharing: boolean; lastAt?: string; now: number; onChange: () => void }) {
  const [mode, setMode] = useState<"off" | "gps" | "sim">("off");
  const [msg, setMsg] = useState<string | null>(null);
  const [t, setT] = useState(0);
  const watch = useRef<number | null>(null);
  const sim = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSent = useRef(0);

  const stop = async (silent = false) => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    if (sim.current) clearInterval(sim.current);
    watch.current = null; sim.current = null;
    setMode("off");
    if (!silent) { await api("/rider/sharing", { method: "POST", json: { on: false } }).catch(() => {}); onChange(); }
  };
  const send = async (lat: number, lng: number, accuracy?: number) => {
    try { await api("/rider/location", { method: "POST", json: { lat, lng, accuracy } }); }
    catch (e: any) { if (e.code === "NO_ACTIVE_DELIVERY") { setMsg(e.message); stop(true); } }
  };
  const startGps = () => {
    setMsg(null);
    if (!("geolocation" in navigator)) { setMsg("This device can’t share location. The customer still sees the text timeline."); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => { if (Date.now() - lastSent.current > 4000) { lastSent.current = Date.now(); send(p.coords.latitude, p.coords.longitude, p.coords.accuracy); } },
      (e) => { setMsg(e.code === e.PERMISSION_DENIED ? "Location permission is off. The customer still sees the text timeline." : "Can’t get a GPS fix right now."); stop(true); },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    setMode("gps");
  };
  const startSim = () => {
    setMsg(null);
    const from = { lat: delivery.storeLat, lng: delivery.storeLng }, to = { lat: delivery.lat, lng: delivery.lng };
    let k = 0;
    const tick = () => { k = Math.min(1, k + 0.04); setT(k); const wob = Math.sin(k * Math.PI) * 0.0015; send(from.lat + (to.lat - from.lat) * k + wob, from.lng + (to.lng - from.lng) * k); if (k >= 1 && sim.current) clearInterval(sim.current); };
    tick();
    sim.current = setInterval(tick, 3000);
    setMode("sim");
  };
  useEffect(() => () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); if (sim.current) clearInterval(sim.current); }, []);

  const live = mode !== "off";
  const progress = delivery.status === "ready" ? 0.04 : mode === "sim" ? 0.08 + t * 0.88 : 0.5;
  return (
    <section aria-labelledby="live-h" className="overflow-hidden rounded-[28px] bg-[#0E1A13] text-white shadow-[0_20px_40px_-24px_rgba(14,26,19,.8)]">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-white/50">Live route · {delivery.code}</p>
          <h2 id="live-h" className="text-base font-semibold">{live ? (mode === "sim" ? "Simulating your ride" : "Sharing your location") : sharing ? "Sharing paused" : "Location sharing is off"}</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${live ? "bg-[#3FCB63]/15 text-[#7EE29A]" : "bg-white/10 text-white/70"}`}>
          <span className={`h-2 w-2 rounded-full ${live ? "bg-[#3FCB63]" : "bg-white/40"}`} />{live ? "LIVE" : "OFF"}
        </span>
      </div>
      <div className="px-3 pb-2 [&_text]:fill-white/80"><RouteMotif progress={progress} animated={live} className="w-full" title={`Route progress for ${delivery.code}`} /></div>
      <div className="space-y-2.5 px-5 pb-5">
        <p className="text-[13px] text-white/60">{live ? "Only this customer can see your position. It stops when you confirm delivery." : "Share so the customer can follow the delivery. It stops automatically when you deliver."}{lastAt ? ` Last sent ${ago(lastAt, now)}.` : ""}</p>
        {msg ? <p className="rounded-xl bg-[#3A2D0D] px-3 py-2 text-[13px] text-[#F3C969]" role="status">{msg}</p> : null}
        {live ? (
          <button type="button" onClick={() => stop()} className="min-h-12 w-full rounded-2xl border border-white/20 text-sm font-semibold hover:bg-white/5">Pause sharing (simulate lost signal)</button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={startGps} className="min-h-12 rounded-2xl bg-brand text-sm font-semibold hover:bg-brand-dark">Share location</button>
            <button type="button" onClick={startSim} data-testid="simulate-ride" className="min-h-12 rounded-2xl border border-white/20 text-sm font-semibold hover:bg-white/5">
              Simulate ride <span className="ml-1 rounded border border-dashed px-1 text-[9px] uppercase" style={{ borderColor: GOLD, color: GOLD }}>Demo</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function RiderSignIn() {
  const accounts = useApi<{ riders: { id: string; name: string; store: string }[] }>("/demo/accounts");
  return (
    <main id="main" className="min-h-dvh bg-[#0E1A13] px-5 py-10 text-white">
      <div className="mx-auto max-w-md space-y-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: GOLD }}>KripFresh · Delivery partner</p>
        <h1 className="text-2xl font-semibold">Choose your rider account</h1>
        <p className="text-sm text-white/60">Demo sign-in. You’ll see the deliveries assigned to that rider.</p>
        <ul className="space-y-2.5">
          {(accounts.data?.riders ?? []).map((r) => (
            <li key={r.id}>
              <button className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4 text-left hover:bg-white/10"
                onClick={async () => { await api("/demo/session", { method: "POST", json: { role: "rider", id: r.id } }); location.reload(); }}>
                <IconScooter className="h-5 w-5 text-[#7EE29A]" />
                <span className="flex-1"><b className="block font-semibold">{r.name}</b><span className="text-xs text-white/55">Usually at {r.store}</span></span>
                <IconChevron className="h-5 w-5 text-white/40" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
