"use client";
import { use, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { useApi, useNow } from "@/lib/client/hooks";
import { ago, minutesUntil, timeIST } from "@/lib/format";
import { distanceMeters } from "@/lib/geo";
import { rupees } from "@/lib/money";
import type { CatalogueProduct } from "@/lib/types";
import { CustomerHeader } from "@/components/customer/Shell";
import { RouteMotif } from "@/components/RouteMotif";
import { Button, ErrorBox, Notice, Sheet, Skeleton } from "@/components/ui";
import { OrderAgain } from "@/components/customer/OrderAgain";
import { IconAlert, IconCheck, IconClock, IconPhone, IconPin, IconStore } from "@/components/icons";

const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-[var(--radius-card)] bg-mint" /> });

export default function TrackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data, error, reload, lastOkAt } = useApi<{ order: any }>(`/orders/${code}`, { pollMs: 4000 });
  const now = useNow(10000);
  const o = data?.order;

  return (
    <>
      <CustomerHeader back="/orders" title={`Order ${code}`} />
      <main id="main" className="mx-auto max-w-2xl space-y-4 px-4 pb-16 pt-4">
        {error && o ? (
          <ErrorBox compact message={`Can’t refresh right now${lastOkAt ? ` — showing the update from ${ago(lastOkAt, now)}` : ""}.`} onRetry={reload} />
        ) : null}
        {error && !o ? <ErrorBox message={error.message} onRetry={reload} /> : null}
        {!o && !error ? <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-64" /></div> : null}
        {o ? <Tracking o={o} now={now} reload={reload} /> : null}
      </main>
    </>
  );
}

function progressFor(o: any): number {
  switch (o.status) {
    case "placed": return 0.04;
    case "accepted": return 0.1;
    case "packing": return 0.2;
    case "ready": return 0.32;
    case "out_for_delivery": {
      const loc = o.rider?.location;
      if (!loc) return 0.6;
      const total = distanceMeters(o.store, o.address) || 1;
      return Math.min(0.95, Math.max(0.38, 1 - distanceMeters(loc, o.address) / total));
    }
    case "delivered": return 1;
    default: return 0;
  }
}

function Tracking({ o, now, reload }: { o: any; now: number; reload: () => void }) {
  const [mapDown, setMapDown] = useState(false);
  const active = !["delivered", "declined", "cancelled"].includes(o.status);
  const loc = o.rider?.location;
  const shortItems = o.items.filter((i: any) => i.status === "short");

  return (
    <>
      {/* Arrival window first */}
      <section className={`rounded-[var(--radius-card)] p-5 ${o.status === "declined" || o.status === "cancelled" ? "bg-danger-bg" : "bg-mint"}`} aria-live="polite">
        {o.status === "delivered" ? (
          <>
            <p className="text-sm font-semibold text-brand">Delivered</p>
            <p className="text-2xl font-bold">at {timeIST(o.timeline.find((t: any) => t.status === "delivered")?.at ?? o.lastUpdateAt)}</p>
            <p className="mt-1 text-sm">Thank you for shopping at {o.store.name}.</p>
          </>
        ) : o.status === "cancelled" ? (
          <>
            <p className="text-sm font-semibold text-danger">Order cancelled</p>
            <p className="mt-1 text-base font-semibold">{o.cancelReason}</p>
            <p className="mt-1 text-sm">{o.paymentStatus === "paid" ? `A full refund of ${rupees(o.total)} has been started (simulated).` : "You have not been charged."}</p>
            <OrderAgain o={o} className="mt-3" />
          </>
        ) : o.status === "declined" ? (
          <>
            <p className="text-sm font-semibold text-danger">Order declined by the store</p>
            <p className="mt-1 text-base font-semibold">{o.declineReason}</p>
            <p className="mt-1 text-sm">{o.paymentStatus === "paid" ? "A full refund has been started (simulated)." : "You have not been charged."}</p>
            <Link href="/stores" className="mt-3 inline-flex min-h-12 items-center rounded-2xl bg-brand px-5 font-semibold text-white">Try another store</Link>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-brand"><IconClock className="h-4 w-4" /> Estimated arrival{o.etaRevised ? <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] text-warn">Updated</span> : null}</p>
            <p className="text-[28px] font-bold leading-tight">{timeIST(o.etaMinAt)} – {timeIST(o.etaMaxAt)}</p>
            <p className="text-sm text-ink-2">about {minutesUntil(o.etaMinAt, now)}–{Math.max(minutesUntil(o.etaMaxAt, now), minutesUntil(o.etaMinAt, now) + 1)} min · an estimate, based on packing, store workload, rider availability and travel time</p>
            {o.etaRevised && o.etaNote ? <p className="mt-2 text-sm font-medium text-warn">{o.etaNote}</p> : null}
          </>
        )}
        {o.status !== "declined" ? <RouteMotif className="mt-3 w-full max-w-md" progress={progressFor(o)} animated={active} title={`Order progress: ${o.statusLabel}`} /> : null}
      </section>

      {shortItems.length ? <ShortItems code={o.code} items={shortItems} onDone={reload} /> : null}

      {o.status === "out_for_delivery" ? (
        <section aria-labelledby="live-h" className="space-y-2">
          <h2 id="live-h" className="text-base font-semibold">Live location</h2>
          {loc && !mapDown ? (
            <MapView className="h-60" label="Map showing the store, your rider and your address"
              markers={[{ id: "s", kind: "store", pos: o.store, label: o.store.name }, { id: "r", kind: "rider", pos: loc, label: `${o.rider.name} (rider)`, muted: loc.stale }, { id: "h", kind: "home", pos: o.address, label: "You" }]}
              route={[o.store, loc, o.address]} onUnavailable={() => setMapDown(true)} />
          ) : null}
          {loc?.stale ? <Notice tone="warn"><strong>Rider’s signal dropped.</strong> Showing the last known location from {ago(loc.updatedAt, now)} ({timeIST(loc.updatedAt)}). Your order is still on its way.</Notice>
            : loc ? <p className="text-xs text-ink-2">Rider location updated {ago(loc.updatedAt, now)}.</p>
            : <Notice>Live location isn’t available right now. Your order is on the way — follow the progress below.</Notice>}
          {mapDown && loc ? <Notice>The map couldn’t load. Your rider was last seen {ago(loc.updatedAt, now)}.</Notice> : null}
          {o.rider ? (
            <div className="flex items-center gap-3 rounded-2xl border border-line p-3 text-sm">
              <span className="flex-1"><strong>{o.rider.name}</strong> is delivering your order<span className="block text-xs text-ink-2">{o.rider.vehicle}</span></span>
              <a href={`tel:${o.rider.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-brand px-3 font-semibold text-brand"><IconPhone className="h-4 w-4" /> Call</a>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="tl-h" className="rounded-[var(--radius-card)] border border-line p-4">
        <h2 id="tl-h" className="mb-3 text-base font-semibold">Order status</h2>
        <ol className="space-y-0">
          {o.timeline.map((t: any, i: number) => (
            <li key={t.status} className="relative flex gap-3 pb-4 last:pb-0" aria-current={t.current ? "step" : undefined}>
              {i < o.timeline.length - 1 ? <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${o.timeline[i + 1].done ? "bg-brand" : "bg-line"}`} aria-hidden /> : null}
              <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${t.done ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
                {t.done ? <IconCheck className="h-4 w-4" /> : null}
              </span>
              <span className="flex-1">
                <span className={`block text-[15px] ${t.current ? "font-bold" : t.done ? "font-medium" : "text-ink-2"}`}>{t.label}</span>
                <span className="block text-xs text-ink-2">{t.current && o.status !== "delivered" ? "Now · " : t.done ? "Done · " : "Waiting"}{t.at ? timeIST(t.at) : ""}</span>
              </span>
            </li>
          ))}
        </ol>
        {o.status === "declined" ? <p className="mt-2 text-sm font-semibold text-danger">Declined: {o.declineReason}</p> : null}
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-2">Last update {timeIST(o.lastUpdateAt)} ({ago(o.lastUpdateAt, now)})</p>
      </section>

      {o.events.some((e: any) => e.kind !== "status") ? (
        <section aria-labelledby="upd-h" className="rounded-[var(--radius-card)] border border-line p-4">
          <h2 id="upd-h" className="mb-2 text-base font-semibold">Updates</h2>
          <ul className="space-y-2 text-sm">
            {o.events.filter((e: any) => e.kind !== "status").slice().reverse().map((e: any, i: number) => (
              <li key={i} className="flex gap-3"><span className="w-16 shrink-0 text-xs text-ink-2">{timeIST(e.at)}</span><span>{e.message}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="det-h" className="rounded-[var(--radius-card)] border border-line p-4 text-sm">
        <h2 id="det-h" className="mb-3 text-base font-semibold">Order details</h2>
        <dl className="space-y-2">
          <div className="flex gap-2"><dt className="flex w-28 shrink-0 items-center gap-1.5 text-ink-2"><IconStore className="h-4 w-4" />Store</dt><dd className="font-medium">{o.store.name}</dd></div>
          <div className="flex gap-2"><dt className="w-28 shrink-0 pl-[22px] text-ink-2">Order no.</dt><dd className="font-semibold">{o.code}</dd></div>
          <div className="flex gap-2"><dt className="flex w-28 shrink-0 items-center gap-1.5 text-ink-2"><IconPin className="h-4 w-4" />Deliver to</dt><dd>{[o.address.flat, o.address.floor && `${o.address.floor} floor`, o.address.line].filter(Boolean).join(", ")}{o.address.instructions ? <span className="block text-xs text-ink-2">“{o.address.instructions}”</span> : null}</dd></div>
        </dl>
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {o.items.map((i: any) => (
            <li key={i.id} className="flex items-center justify-between gap-2 py-2">
              <span className={i.status === "removed" ? "text-ink-2 line-through" : ""}>{i.name} <strong>{i.packLabel}</strong> × {i.qty - i.removedQty}
                {i.removedQty > 0 ? <span className="block text-xs text-warn">{i.removedQty} unavailable — {i.status === "replaced" || o.items.some((x: any) => x.replacesItemId === i.id) ? "replaced" : "removed"}</span> : null}
                {i.replacesItemId ? <span className="block text-xs text-brand">Replacement you approved</span> : null}
              </span>
              <span className="shrink-0">{rupees(i.price * (i.qty - i.removedQty))}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-line pt-2">
          <div className="flex justify-between"><dt>Item total</dt><dd>{rupees(o.subtotal)}</dd></div>
          {o.discount ? <div className="flex justify-between font-semibold text-brand"><dt>Coupon {o.couponCode}</dt><dd>−{rupees(o.discount)}</dd></div> : null}
          <div className="flex justify-between"><dt>Delivery fee</dt><dd>{o.deliveryFee ? rupees(o.deliveryFee) : "Free"}</dd></div>
          <div className="flex justify-between"><dt>Handling charge</dt><dd>{rupees(o.handlingFee)}</dd></div>
          {o.smallCartFee ? <div className="flex justify-between"><dt>Small cart fee</dt><dd>{rupees(o.smallCartFee)}</dd></div> : null}
          {o.tip ? <div className="flex justify-between"><dt>Delivery partner tip</dt><dd>{rupees(o.tip)}</dd></div> : null}
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{rupees(o.total)}</dd></div>
          <div className="flex justify-between text-xs text-ink-2"><dt>Payment</dt><dd>{o.paymentMethod === "cod" ? (o.paymentStatus === "paid" ? "Cash on delivery · paid" : "Cash on delivery") : "UPI (simulated) · paid"}</dd></div>
          <div className="flex justify-between text-xs text-ink-2"><dt>If unavailable</dt><dd>{o.substitutionPref === "contact" ? "Contact me" : "Remove item"}</dd></div>
        </dl>
      </section>

      <AfterOrder o={o} reload={reload} />
    </>
  );
}

const CANCEL_REASONS = ["Ordered by mistake", "Want to change items", "Delivery is taking too long", "Found a better price", "Other"];
const ISSUES: [string, string][] = [["missing", "Item missing"], ["damaged", "Item damaged or spilled"], ["wrong", "Wrong item delivered"], ["quality", "Poor quality or expired"], ["late", "Delivery was very late"], ["other", "Something else"]];

/** Cancel (before packing), rate, get help, order again. */
function AfterOrder({ o, reload }: { o: any; reload: () => void }) {
  const [sheet, setSheet] = useState<null | "cancel" | "help">(null);
  const [reason, setReason] = useState("");
  const [kind, setKind] = useState("missing");
  const [picked, setPicked] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [stars, setStars] = useState<number>(o.rating ?? 0);

  const post = async (path: string, json: object, done: (r: any) => void) => {
    setBusy(true); setErr(null);
    try { const r = await api(`/orders/${o.code}/${path}`, { method: "POST", json }); done(r); reload(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const itemIssue = ["missing", "damaged", "wrong", "quality"].includes(kind);
  const delivered = o.status === "delivered";
  if (!o.canCancel && !delivered && !o.tickets?.length) return null;

  return (
    <section aria-labelledby="after-h" className="space-y-3 rounded-[var(--radius-card)] border border-line p-4">
      <h2 id="after-h" className="text-base font-semibold">{delivered ? "How was your order?" : "Need to change something?"}</h2>
      {msg ? <Notice>{msg}</Notice> : null}
      {o.canCancel ? (
        <div className="space-y-2 text-sm">
          <p className="text-ink-2">You can cancel until the store starts packing. {o.paymentStatus === "paid" ? "You’ll get a full refund." : "You won’t be charged."}</p>
          <Button variant="danger" onClick={() => setSheet("cancel")}>Cancel order</Button>
        </div>
      ) : null}
      {delivered ? (
        <>
          <div>
            <p className="mb-1 text-sm text-ink-2">Rate your delivery</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} disabled={busy}
                  onClick={() => { setStars(n); post("rate", { stars: n }, () => setMsg("Thanks for rating your delivery.")); }}
                  className={`grid h-11 w-11 place-items-center rounded-xl text-2xl ${n <= stars ? "text-[#E2A319]" : "text-line"} hover:bg-tile`}>★</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderAgain o={o} />
            {o.canReportIssue ? <Button variant="secondary" onClick={() => { setSheet("help"); setPicked([]); setNote(""); }}>Get help with this order</Button> : null}
          </div>
          {!o.canReportIssue ? <p className="text-xs text-ink-2">Problems can be reported within 48 hours of delivery. After that, contact <Link href="/help" className="font-semibold text-brand underline">Help &amp; support</Link>.</p> : null}
        </>
      ) : null}
      {o.tickets?.length ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Your support requests</h3>
          {o.tickets.map((t: any) => (
            <div key={t.id} className="rounded-xl bg-tile p-3 text-sm">
              <p className="flex justify-between gap-2"><b>#{t.id} · {ISSUES.find((x) => x[0] === t.kind)?.[1]}</b>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.status === "refund_approved" ? "bg-offbg text-brand" : "bg-warn-bg text-warn"}`}>{t.status === "refund_approved" ? `Refund ${rupees(t.refundAmount)} approved` : "In review"}</span></p>
              {t.items?.length ? <p className="text-ink-2">{t.items.map((i: any) => i.name).join(", ")}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <Sheet open={sheet === "cancel"} onClose={() => setSheet(null)} title={`Cancel ${o.code}?`}
        footer={<><Button variant="danger" busy={busy} disabled={!reason} onClick={() => post("cancel", { reason }, () => { setSheet(null); setMsg("Your order is cancelled."); })}>Cancel order</Button><Button variant="ghost" onClick={() => setSheet(null)}>Keep my order</Button></>}>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm">Why are you cancelling?</legend>
          {CANCEL_REASONS.map((r) => (
            <label key={r} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 text-sm font-medium ${reason === r ? "border-brand bg-mint" : "border-line"}`}>
              <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-[#1C9A41]" />{r}
            </label>
          ))}
        </fieldset>
        {err ? <div className="mt-3"><ErrorBox compact message={err} /></div> : null}
      </Sheet>

      <Sheet open={sheet === "help"} onClose={() => setSheet(null)} title="What went wrong?"
        footer={<Button busy={busy} disabled={itemIssue && !picked.length} onClick={() => post("issues", { kind, itemIds: picked, note }, (r) => { setSheet(null); setMsg(r.result.refund ? `Refund of ${rupees(r.result.refund)} approved. It goes back to your original payment method (simulated).` : `Request #${r.result.ticketId} received. We’ll reply within 24 hours.`); })}>Submit</Button>}>
        <div className="space-y-4 text-sm">
          <fieldset className="grid gap-2">
            <legend className="sr-only">Problem</legend>
            {ISSUES.map(([k, l]) => (
              <label key={k} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 font-medium ${kind === k ? "border-brand bg-mint" : "border-line"}`}>
                <input type="radio" name="issue-kind" checked={kind === k} onChange={() => setKind(k)} className="h-5 w-5 accent-[#1C9A41]" />{l}
              </label>
            ))}
          </fieldset>
          {itemIssue ? (
            <fieldset className="grid gap-2">
              <legend className="mb-1 font-semibold">Which items?</legend>
              {o.items.filter((i: any) => i.qty > i.removedQty).map((i: any) => (
                <label key={i.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3">
                  <input type="checkbox" checked={picked.includes(i.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, i.id] : picked.filter((x) => x !== i.id))} className="h-5 w-5 accent-[#1C9A41]" />
                  <span className="flex-1">{i.name} <b>{i.packLabel}</b> × {i.qty - i.removedQty}</span><span>{rupees(i.price * (i.qty - i.removedQty))}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <label className="block"><span className="mb-1 block font-medium">Anything else? (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-xl border-2 border-line p-3 focus:border-brand focus:outline-none" /></label>
          <p className="text-xs text-ink-2">Item refunds up to ₹500 are approved straight away and go back to your original payment method (simulated). Other requests are reviewed within 24 hours.</p>
          {err ? <ErrorBox compact message={err} /> : null}
        </div>
      </Sheet>
    </section>
  );
}

function ShortItems({ code, items, onDone }: { code: string; items: any[]; onDone: () => void }) {
  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border-2 border-warn bg-warn-bg p-4" aria-labelledby="act-h" role="alert">
      <h2 id="act-h" className="flex items-center gap-2 text-base font-semibold text-warn"><IconAlert /> Action needed</h2>
      {items.map((it) => <ShortItem key={it.id} code={code} item={it} onDone={onDone} />)}
    </section>
  );
}

function ShortItem({ code, item, onDone }: { code: string; item: any; onDone: () => void }) {
  const short = item.qty - item.packedQty;
  const alts = useApi<{ alternatives: CatalogueProduct[] }>(`/orders/${code}/items/${item.id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const act = async (action: "remove" | "replace", p?: CatalogueProduct) => {
    setBusy(p?.productId ?? action); setErr(null);
    try { await api(`/orders/${code}/items/${item.id}`, { method: "POST", json: { action, productId: p?.productId, price: p?.price } }); onDone(); }
    catch (e: any) { setErr(e.message); alts.reload(); }
    finally { setBusy(null); }
  };
  return (
    <div className="rounded-2xl bg-white p-3 text-sm">
      <p><strong>{short} × {item.name} ({item.packLabel})</strong> is unavailable{item.packedQty ? ` — ${item.packedQty} of ${item.qty} were packed` : ""}.</p>
      <p className="mb-2 text-xs text-ink-2">Choose a replacement or remove it. Price differences are shown before you confirm.</p>
      {err ? <div className="mb-2"><ErrorBox compact message={err} /></div> : null}
      <ul className="space-y-2">
        {(alts.data?.alternatives ?? []).slice(0, 3).map((p) => {
          const diff = (p.price - item.price) * short;
          return (
            <li key={p.productId} className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="h-10 w-10 rounded-lg bg-mint object-contain p-1" />
              <span className="flex-1">{p.name} <strong>{p.packLabel}</strong><span className="block text-xs text-ink-2">{rupees(p.price)} each · {diff === 0 ? "same price" : diff > 0 ? `${rupees(diff)} more in total` : `${rupees(-diff)} less in total`}</span></span>
              <Button variant="secondary" className="min-h-11 px-3" busy={busy === p.productId} onClick={() => act("replace", p)}>Use this</Button>
            </li>
          );
        })}
      </ul>
      <Button variant="danger" className="mt-3 w-full" busy={busy === "remove"} onClick={() => act("remove")}>Remove the item</Button>
    </div>
  );
}
