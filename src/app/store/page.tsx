"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useApi, useNow } from "@/lib/client/hooks";
import { ago, timeIST } from "@/lib/format";
import { rupees } from "@/lib/money";
import { Button, ErrorBox, Sheet, Skeleton, inputCls } from "@/components/ui";
import { IconCheck, IconChevron, IconClock, IconX } from "@/components/icons";
import { tintFor } from "@/components/customer/ProductCard";

type View = "new" | "active" | "done";
const REASONS = ["Items are out of stock", "Too busy right now", "Store is closing soon", "Can’t deliver to this address", "Other"];

export default function StoreOrdersPage() {
  const [view, setView] = useState<View>("new");
  const { data, error, reload } = useApi<{ orders: any[]; counts: { new: number; active: number } }>(`/store/orders?view=${view}`, { pollMs: 5000 });
  const now = useNow(15000);
  const tabs: [View, string, number | undefined][] = [["new", "New orders", data?.counts.new], ["active", "In progress", data?.counts.active], ["done", "Completed", undefined]];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Order lists">
        {tabs.map(([v, label, n]) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`min-h-11 rounded-full border-[1.5px] px-2 text-[13px] font-semibold ${view === v ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"}`}>
            {label}{n ? ` (${n})` : ""}
          </button>
        ))}
      </div>
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : !data ? <Skeleton className="h-40" /> : data.orders.length === 0 ? (
        <div className="rounded-3xl bg-mint p-8 text-center text-sm">
          <p className="text-base font-semibold">{view === "new" ? "No new orders" : view === "active" ? "Nothing in progress" : "No completed orders yet"}</p>
          {view === "new" ? <p className="mt-1 text-ink-2">New orders appear here automatically.</p> : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {data.orders.map((o) => view === "new" ? <NewOrderCard key={o.code} o={o} now={now} onChange={reload} /> : (
            <li key={o.code}>
              <Link href={`/store/orders/${o.code}`} className="flex items-center gap-3 rounded-[22px] bg-white p-4 shadow-[0_6px_22px_-12px_rgba(0,0,0,.28)] hover:bg-mint">
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-2"><strong className="text-lg">{o.code}</strong>
                    <span className="rounded-full bg-fresh px-2.5 py-0.5 text-xs font-semibold">{o.statusLabel}</span>
                    {o.waitingOnCustomer ? <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-semibold text-warn">Waiting on customer</span> : null}
                  </span>
                  <span className="block text-sm text-ink-2">{o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {rupees(o.total)} · {o.riderName ? `Rider: ${o.riderName}` : "No rider yet"}</span>
                </span>
                <span className="inline-flex items-center text-sm font-semibold text-brand">Open <IconChevron className="h-4 w-4" /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewOrderCard({ o, now, onChange }: { o: any; now: number; onChange: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");

  const accept = async () => {
    setBusy(true); setErr(null);
    try { await api(`/store/orders/${o.code}`, { method: "POST", json: { action: "accept" } }); router.push(`/store/orders/${o.code}`); }
    catch (e: any) { setErr(e.message); setBusy(false); onChange(); }
  };
  const decline = async () => {
    const r = reason === "Other" ? other.trim() : reason;
    if (!r) return;
    setBusy(true); setErr(null);
    try { await api(`/store/orders/${o.code}`, { method: "POST", json: { action: "decline", reason: r } }); setDeclining(false); onChange(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <li className="rounded-[22px] bg-white p-4 shadow-[0_6px_22px_-12px_rgba(0,0,0,.28)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-xl">{o.code}</strong>
        <span className="text-sm text-ink-2">Received {timeIST(o.createdAt)} · {ago(o.createdAt, now)}</span>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-2xl bg-t0 p-2.5"><dt className="text-xs text-ink-2">Items</dt><dd className="text-lg font-bold">{o.itemCount}</dd></div>
        <div className="rounded-2xl bg-t1 p-2.5"><dt className="text-xs text-ink-2">Total</dt><dd className="text-lg font-bold">{rupees(o.total)}</dd></div>
        <div className="rounded-2xl bg-t3 p-2.5"><dt className="flex items-center gap-1 text-xs text-ink-2"><IconClock className="h-3.5 w-3.5" />Pickup by</dt><dd className="text-lg font-bold">{timeIST(o.expectedPickupAt)}</dd></div>
      </dl>
      {o.items?.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Items in this order">
          {o.items.slice(0, 6).map((i: any) => (
            <li key={i.productId} className={`relative grid h-[52px] w-[52px] place-items-center rounded-[14px] ${tintFor(i.productId)}`} title={`${i.name} ${i.packLabel} × ${i.qty}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.image} alt={`${i.name} ${i.packLabel}`} className="h-[64%] w-[64%] object-contain" />
              <span className="absolute -bottom-1 -right-1 rounded-lg bg-ink px-1.5 text-[10px] font-bold leading-4 text-white">×{i.qty}</span>
            </li>
          ))}
          {o.items.length > 6 ? <li className="grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-tile text-sm font-bold text-ink-2">+{o.items.length - 6}</li> : null}
        </ul>
      ) : null}
      <p className="mt-2 text-xs text-ink-2">{o.paymentMethod === "cod" ? "Cash on delivery" : "Paid online (simulated)"} · If unavailable: {o.substitutionPref === "contact" ? "contact customer" : "remove item"}</p>
      {err ? <div className="mt-2"><ErrorBox compact message={err} /></div> : null}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Button size="lg" className="!rounded-2xl" onClick={accept} busy={busy} data-testid={`accept-${o.code}`}><IconCheck /> Accept</Button>
        <Button size="lg" variant="danger" className="!rounded-2xl" onClick={() => setDeclining(true)} disabled={busy}><IconX /> Decline</Button>
      </div>
      <Sheet open={declining} onClose={() => setDeclining(false)} title={`Decline ${o.code}?`}
        footer={<><Button variant="danger" onClick={decline} busy={busy} disabled={!reason || (reason === "Other" && !other.trim())}>Decline and tell the customer</Button><Button variant="ghost" onClick={() => setDeclining(false)}>Keep order</Button></>}>
        <fieldset>
          <legend className="mb-2 text-sm">Why can’t you take this order? The customer will see this.</legend>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 text-sm font-medium ${reason === r ? "border-brand bg-mint" : "border-line"}`}>
                <input type="radio" name={`reason-${o.code}`} checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-[#1C9A41]" /> {r}
              </label>
            ))}
          </div>
          {reason === "Other" ? <><label htmlFor={`other-${o.code}`} className="mt-3 block text-sm font-medium">Reason</label><input id={`other-${o.code}`} className={inputCls} value={other} onChange={(e) => setOther(e.target.value)} /></> : null}
        </fieldset>
      </Sheet>
    </li>
  );
}
