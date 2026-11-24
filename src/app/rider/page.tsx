"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useApi, useNow } from "@/lib/client/hooks";
import { ago } from "@/lib/format";
import { rupees } from "@/lib/money";
import { Button, DemoTag, ErrorBox, Notice, Skeleton } from "@/components/ui";
import { IconCheck, IconNav, IconPhone, IconPin, IconScooter, IconStore } from "@/components/icons";

type Me = { role: string; id: string; name: string };
const navUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`;

export default function RiderPage() {
  const me = useApi<Me>("/me");
  if (me.error) return <div className="p-4"><ErrorBox message={me.error.message} onRetry={me.reload} /></div>;
  if (!me.data) return <div className="p-4"><Skeleton className="h-40" /></div>;
  if (me.data.role !== "rider") return <RiderSignIn />;
  return <RiderHome />;
}

function RiderHome() {
  const { data, error, reload } = useApi<{ rider: any; deliveries: any[] }>("/rider/deliveries", { pollMs: 5000 });
  const now = useNow(10000);
  const active = data?.deliveries.filter((d) => d.status !== "delivered") ?? [];
  const onRoad = active.find((d) => d.status === "out_for_delivery") ?? active.find((d) => d.status === "ready");
  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><IconScooter /></span>
          <div className="flex-1"><p className="font-semibold">{data?.rider?.name ?? "Delivery partner"}</p><p className="text-xs text-ink-2">{data?.rider?.vehicle}</p></div>
          <a href="/demo" className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-brand px-2.5 text-xs font-semibold uppercase text-brand">Demo</a>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
        {onRoad ? <LocationSharer delivery={onRoad} onChange={reload} sharing={!!data?.rider?.sharing} lastAt={data?.rider?.locationAt} now={now} /> : (
          <Notice>Location sharing is <strong>off</strong>. You’ll be asked to share your location only during an active delivery.</Notice>
        )}
        <h1 className="text-lg font-semibold">Assigned deliveries {active.length ? `(${active.length})` : ""}</h1>
        {!data ? <Skeleton className="h-48" /> : data.deliveries.length === 0 ? (
          <div className="rounded-2xl bg-mint p-8 text-center text-sm"><p className="text-base font-semibold">No deliveries assigned</p><p className="mt-1 text-ink-2">New assignments appear here automatically.</p></div>
        ) : (
          <ul className="space-y-4">{data.deliveries.map((d) => <DeliveryCard key={d.code} d={d} onChange={reload} />)}</ul>
        )}
      </main>
    </div>
  );
}

function DeliveryCard({ d, onChange }: { d: any; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const act = async (action: "pickup" | "deliver") => {
    setBusy(true); setErr(null);
    try { await api(`/rider/orders/${d.code}`, { method: "POST", json: { action } }); onChange(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const a = d.address;
  const done = d.status === "delivered";
  return (
    <li className={`rounded-[var(--radius-card)] border-2 p-4 ${done ? "border-line opacity-70" : "border-brand"}`}>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xl">{d.code}</strong>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${done ? "bg-mint" : "bg-fresh"}`}>{d.statusLabel}</span>
      </div>
      <p className="mt-1 text-sm text-ink-2">{d.itemCount} item{d.itemCount === 1 ? "" : "s"} · {d.paymentMethod === "cod" && d.paymentStatus !== "paid" ? <strong className="text-ink">Collect {rupees(d.total)} cash/UPI</strong> : "Already paid"}</p>

      <div className="mt-3 space-y-3">
        <div className="flex gap-3">
          <IconStore className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="flex-1 text-sm"><p className="text-xs font-semibold uppercase text-ink-2">Pickup</p><p className="font-semibold">{d.storeName}</p><p className="text-ink-2">{d.storeAddress}</p></div>
          {!done ? <a href={navUrl(d.storeLat, d.storeLng)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-xl border-2 border-brand px-3 text-sm font-semibold text-brand"><IconNav className="h-4 w-4" /> Navigate</a> : null}
        </div>
        <div className="flex gap-3">
          <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="flex-1 text-sm">
            <p className="text-xs font-semibold uppercase text-ink-2">Deliver to {d.customerName && d.customerName !== "Guest" ? d.customerName : "customer"}</p>
            <p className="font-semibold">{[a.flat, a.floor && `${a.floor} floor`].filter(Boolean).join(", ")}</p>
            <p className="text-ink-2">{a.line}</p>
            {a.landmark ? <p className="text-ink-2">Landmark: {a.landmark}</p> : null}
            {a.instructions ? <p className="mt-1 rounded-lg bg-warn-bg px-2 py-1 text-warn">“{a.instructions}”</p> : null}
          </div>
          {!done ? <a href={navUrl(d.lat, d.lng)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-xl border-2 border-brand px-3 text-sm font-semibold text-brand"><IconNav className="h-4 w-4" /> Navigate</a> : null}
        </div>
      </div>
      {err ? <div className="mt-3"><ErrorBox compact message={err} /></div> : null}
      {!done ? (
        <div className="mt-4 space-y-2">
          {d.status === "out_for_delivery" ? (
            <Button size="lg" className="w-full text-lg" onClick={() => act("deliver")} busy={busy} data-testid={`deliver-${d.code}`}><IconCheck /> Confirm delivery</Button>
          ) : (
            <Button size="lg" className="w-full text-lg" onClick={() => act("pickup")} busy={busy} disabled={d.status !== "ready"} data-testid={`pickup-${d.code}`}><IconCheck /> Confirm pickup</Button>
          )}
          {d.status !== "ready" && d.status !== "out_for_delivery" ? <p className="text-center text-sm font-medium text-ink-2">Store is {d.statusLabel.toLowerCase()} — pickup unlocks when the order is ready.</p> : null}
          {(d.customerPhone || a.phone) ? <a href={`tel:${String(d.customerPhone || a.phone).replace(/\s/g, "")}`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-brand font-semibold text-brand"><IconPhone className="h-5 w-5" /> Call customer</a> : null}
        </div>
      ) : null}
    </li>
  );
}

/** Shares GPS only while a delivery is active; stops when it ends or on request. Includes a demo simulator. */
function LocationSharer({ delivery, onChange, sharing, lastAt, now }: { delivery: any; onChange: () => void; sharing: boolean; lastAt?: string; now: number }) {
  const [mode, setMode] = useState<"off" | "gps" | "sim">("off");
  const [msg, setMsg] = useState<string | null>(null);
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
    if (!("geolocation" in navigator)) { setMsg("This device can’t share location. Use the demo simulator or keep the customer updated by phone."); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => { if (Date.now() - lastSent.current > 4000) { lastSent.current = Date.now(); send(p.coords.latitude, p.coords.longitude, p.coords.accuracy); } },
      (e) => { setMsg(e.code === e.PERMISSION_DENIED ? "Location permission is off. The customer will still see the text timeline." : "Can’t get a GPS fix right now."); stop(true); },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    setMode("gps");
  };
  const startSim = () => {
    setMsg(null);
    const from = { lat: delivery.storeLat, lng: delivery.storeLng }, to = { lat: delivery.lat, lng: delivery.lng };
    let t = 0;
    const tick = () => { t = Math.min(1, t + 0.04); const wob = Math.sin(t * Math.PI) * 0.0015; send(from.lat + (to.lat - from.lat) * t + wob, from.lng + (to.lng - from.lng) * t); if (t >= 1 && sim.current) clearInterval(sim.current); };
    tick();
    sim.current = setInterval(tick, 3000);
    setMode("sim");
  };
  // Stop automatically when there is no active delivery any more.
  useEffect(() => () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); if (sim.current) clearInterval(sim.current); }, []);

  return (
    <section className="rounded-[var(--radius-card)] bg-mint p-4" aria-labelledby="loc-h">
      <h2 id="loc-h" className="font-semibold">Live location for {delivery.code}</h2>
      <p className="mb-3 text-sm text-ink-2">
        {mode === "gps" ? "Sharing your GPS location with this customer only." : mode === "sim" ? "Simulating your ride from the store to the customer." : sharing ? "Paused — the customer sees your last known location." : "Share your location so the customer can follow the delivery. Stops automatically when it’s delivered."}
        {lastAt ? ` Last sent ${ago(lastAt, now)}.` : ""}
      </p>
      {msg ? <div className="mb-2"><Notice tone="warn">{msg}</Notice></div> : null}
      {mode === "off" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={startGps}><IconPin /> Share my location</Button>
          <Button variant="secondary" onClick={startSim} data-testid="simulate-ride">Simulate ride <DemoTag /></Button>
        </div>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => stop()}>Pause sharing (simulate lost signal)</Button>
      )}
    </section>
  );
}

function RiderSignIn() {
  const accounts = useApi<{ riders: { id: string; name: string; store: string }[] }>("/demo/accounts");
  const router = useRouter();
  return (
    <main id="main" className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Delivery partner</h1>
      <p className="text-sm text-ink-2">Choose a rider account to see assigned deliveries.</p>
      <DemoTag>Demo sign-in</DemoTag>
      {(accounts.data?.riders ?? []).map((r) => (
        <Button key={r.id} variant="secondary" className="w-full justify-start" onClick={async () => { await api("/demo/session", { method: "POST", json: { role: "rider", id: r.id } }); router.refresh(); location.reload(); }}>
          <IconScooter /> {r.name} <span className="font-normal text-ink-2">· usually at {r.store}</span>
        </Button>
      ))}
    </main>
  );
}
