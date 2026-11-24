"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiErr } from "@/lib/client/api";
import { cart, clearCart, setQty, setup } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { rupees } from "@/lib/money";
import type { PaymentMethod, Quote, SubstitutionPref } from "@/lib/types";
import { CustomerHeader } from "@/components/customer/Shell";
import { Button, DemoTag, ErrorBox, Notice, QtyStepper, Sheet, Skeleton } from "@/components/ui";
import { IconClock, IconPin, IconStore } from "@/components/icons";

function newKey() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function CartPage() {
  const hydrated = useHydrated();
  const c = cart.use();
  const s = setup.use();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState<ApiErr | null>(null);
  const [pref, setPref] = useState<SubstitutionPref>("contact");
  const [pay, setPay] = useState<PaymentMethod>("cod");
  const [placing, setPlacing] = useState(false);
  const [placeErr, setPlaceErr] = useState<ApiErr | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [upiOpen, setUpiOpen] = useState(false);
  const paidRef = useRef<string | null>(null);

  const items = useMemo(() => Object.entries(c.items).map(([productId, it]) => ({ productId, qty: it.qty })), [c.items]);
  const sig = JSON.stringify([c.storeId, items, s.address?.lat, s.address?.lng, pref, pay]);

  const refresh = useCallback(async () => {
    if (!c.storeId || !items.length) { setQuote(null); return; }
    try {
      const r = await api<{ quote: Quote }>("/cart/quote", { method: "POST", json: { storeId: c.storeId, items, location: s.address } });
      setQuote(r.quote); setQErr(null);
      // Keep the local snapshot in step with the store's live prices.
      cart.set((cur) => {
        const next = { ...cur.items };
        for (const l of r.quote.lines) if (next[l.productId] && l.price) next[l.productId] = { ...next[l.productId], price: l.price };
        return { ...cur, items: next };
      });
    } catch (e) { setQErr(e as ApiErr); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.storeId, JSON.stringify(items), s.address?.lat, s.address?.lng]);

  useEffect(() => { if (hydrated) { const t = setTimeout(refresh, 250); return () => clearTimeout(t); } }, [hydrated, refresh]);

  // One idempotency key per checkout attempt; reused for retries, renewed if the cart changes.
  const keyFor = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("nb.checkout") ?? "null");
      if (saved?.sig === sig) return saved.key as string;
      const key = newKey();
      sessionStorage.setItem("nb.checkout", JSON.stringify({ sig, key }));
      return key;
    } catch { return newKey(); }
  };

  const place = async () => {
    if (!quote || !s.address || !c.storeId) return;
    if (pay === "upi_demo" && !paidRef.current) { setUpiOpen(true); return; }
    setPlacing(true); setPlaceErr(null); setNotice(null);
    try {
      const res = await api<{ code: string }>("/orders", {
        method: "POST",
        json: {
          idempotencyKey: keyFor(), storeId: c.storeId, address: s.address, substitutionPref: pref, paymentMethod: pay, paymentRef: paidRef.current ?? undefined,
          expectedTotal: quote.total, items: quote.lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price })),
        },
      });
      try { sessionStorage.removeItem("nb.checkout"); } catch {}
      clearCart();
      router.replace(`/orders/${res.code}`);
    } catch (e) {
      const err = e as ApiErr;
      if (["PRICE_CHANGED", "ITEMS_UNAVAILABLE", "OUT_OF_STOCK"].includes(err.code)) {
        setNotice(err.message + " We’ve updated your cart below — please check it and place the order again.");
        if (err.details?.quote) setQuote(err.details.quote);
        await refresh();
      } else setPlaceErr(err);
    } finally { setPlacing(false); }
  };

  if (!hydrated) return <><CustomerHeader back="/" title="Cart" /><div className="mx-auto max-w-xl p-4"><Skeleton className="h-64" /></div></>;

  if (!items.length) {
    return (
      <>
        <CustomerHeader back="/" title="Cart" />
        <main id="main" className="mx-auto grid max-w-xl place-items-center gap-3 px-4 py-16 text-center">
          <p className="text-lg font-semibold">Your cart is empty</p>
          <p className="text-sm text-ink-2">Add groceries from your selected store to get started.</p>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-2xl bg-brand px-6 font-semibold text-white">Start shopping</Link>
        </main>
      </>
    );
  }

  const hasIssues = !!quote && (quote.problems.length > 0 || quote.lines.some((l) => !l.available));
  const blocking = quote?.problems.filter((p) => !quote.lines.some((l) => p.startsWith(`${l.name} (`))) ?? [];
  const toFree = quote && quote.deliveryFee > 0 && quote.subtotal > 0
    ? <p className="mt-3 rounded-xl bg-mint p-2.5 text-xs">Add items worth <strong>{rupees(quote.freeDeliveryAbove - quote.subtotal)}</strong> more for free delivery.</p>
    : null;

  return (
    <>
      <CustomerHeader back="/" title="Cart & checkout" />
      <main id="main" className="mx-auto max-w-5xl px-4 pb-40 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:pb-10">
        <div className="space-y-4">
          <section className="rounded-[var(--radius-card)] border border-line p-4" aria-label="Delivery details">
            <div className="flex items-start gap-3">
              <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">Deliver to {s.address?.label ? `· ${s.address.label}` : ""}</p>
                <p className="text-ink-2">{[s.address?.flat, s.address?.floor && `${s.address.floor} floor`, s.address?.line].filter(Boolean).join(", ")}</p>
                {s.address?.landmark ? <p className="text-ink-2">Landmark: {s.address.landmark}</p> : null}
              </div>
              <Link href="/address" className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-brand hover:bg-mint">Change</Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-sm">
              <span className="inline-flex items-center gap-1.5"><IconStore className="h-4 w-4 text-brand" />{quote?.storeName ?? s.storeName}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold"><IconClock className="h-4 w-4 text-brand" />{quote?.etaMin ? `Estimated ${quote.etaMin}–${quote.etaMax} min` : "Estimating…"}</span>
            </div>
          </section>

          {notice ? <Notice tone="warn">{notice}</Notice> : null}
          {qErr ? <ErrorBox message={qErr.message} onRetry={refresh} /> : null}
          {blocking.length ? <div className="space-y-2">{blocking.map((p) => <ErrorBox key={p} message={p} />)}</div> : null}
          {blocking.length ? <Link href="/stores" className="inline-flex min-h-11 items-center font-semibold text-brand underline">Choose another store</Link> : null}

          <section aria-labelledby="items-h" className="rounded-[var(--radius-card)] border border-line">
            <h2 id="items-h" className="border-b border-line px-4 py-3 text-base font-semibold">Items ({items.reduce((n, i) => n + i.qty, 0)})</h2>
            <ul className="divide-y divide-line">
              {items.map(({ productId }) => {
                const snap = c.items[productId];
                const line = quote?.lines.find((l) => l.productId === productId);
                const label = `${snap.name}, ${snap.packLabel}`;
                return (
                  <li key={productId} className="flex items-center gap-3 px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={snap.image} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-mint object-contain p-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{snap.name}</p>
                      <p className="text-xs text-ink-2"><strong className="text-[13px] font-semibold text-ink">{snap.packLabel}</strong> · {rupees(line?.price || snap.price)} each</p>
                      {line?.issue ? (
                        <p className="mt-1 text-xs font-semibold text-danger">
                          {line.issue}.{" "}
                          {line.stock > 0 && line.price > 0 ? <button className="underline" onClick={() => setQty(c.storeId!, productId, line.stock)}>Change to {line.stock}</button> : <button className="underline" onClick={() => setQty(c.storeId!, productId, 0)}>Remove</button>}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-28 shrink-0 flex-col items-end gap-1">
                      <QtyStepper qty={snap.qty} max={line?.stock || undefined} label={label} onChange={(n) => setQty(c.storeId!, productId, n)} />
                      <span className="text-sm font-semibold">{rupees((line?.price || snap.price) * snap.qty)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <fieldset className="rounded-[var(--radius-card)] border border-line p-4">
            <legend className="float-left mb-2 w-full text-base font-semibold">If an item is unavailable during packing</legend>
            <p className="clear-left mb-3 text-xs text-ink-2">We never swap items or raise your total without asking.</p>
            {([["contact", "Contact me about a replacement", "You choose a replacement or remove the item, from the tracking screen."], ["remove", "Remove the item", "We remove it and reduce your total."]] as const).map(([v, t, d]) => (
              <label key={v} className={`mb-2 flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${pref === v ? "border-brand bg-mint/60" : "border-line"}`}>
                <input type="radio" name="pref" value={v} checked={pref === v} onChange={() => setPref(v)} className="mt-1 h-5 w-5 accent-[#17633A]" />
                <span><span className="block text-sm font-semibold">{t}</span><span className="block text-xs text-ink-2">{d}</span></span>
              </label>
            ))}
          </fieldset>

          <fieldset className="rounded-[var(--radius-card)] border border-line p-4">
            <legend className="float-left mb-2 w-full text-base font-semibold">Payment</legend>
            <label className={`mb-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${pay === "cod" ? "border-brand bg-mint/60" : "border-line"}`}>
              <input type="radio" name="pay" checked={pay === "cod"} onChange={() => setPay("cod")} className="h-5 w-5 accent-[#17633A]" />
              <span className="text-sm font-semibold">Cash on delivery <span className="block text-xs font-normal text-ink-2">Pay the rider in cash or UPI at your door</span></span>
            </label>
            <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${pay === "upi_demo" ? "border-brand bg-mint/60" : "border-line"}`}>
              <input type="radio" name="pay" checked={pay === "upi_demo"} onChange={() => { setPay("upi_demo"); paidRef.current = null; }} className="h-5 w-5 accent-[#17633A]" />
              <span className="flex-1 text-sm font-semibold">UPI / online <span className="block text-xs font-normal text-ink-2">Simulated in this demo — no money moves</span></span>
              <DemoTag>Simulated</DemoTag>
            </label>
          </fieldset>
        </div>

        <aside className="mt-4 lg:mt-0">
          <section className="rounded-[var(--radius-card)] border border-line p-4 lg:sticky lg:top-20" aria-labelledby="bill-h">
            <h2 id="bill-h" className="mb-3 text-base font-semibold">Bill details</h2>
            {!quote ? <Skeleton className="h-28" /> : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt>Item total</dt><dd>{rupees(quote.subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Delivery fee</dt><dd>{quote.deliveryFee ? rupees(quote.deliveryFee) : <span className="font-semibold text-brand">Free</span>}</dd></div>
                <div className="flex justify-between"><dt>Handling charge</dt><dd>{rupees(quote.handlingFee)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>To pay</dt><dd>{rupees(quote.total)}</dd></div>
                <p className="text-xs text-ink-2">Prices in Indian rupees, inclusive of taxes. Final amount is rechecked with the store when you place the order.</p>
              </dl>
            )}
            {toFree}
            {placeErr ? <div className="mt-3"><ErrorBox message={placeErr.network ? "We couldn’t confirm your order because the connection dropped. Tap Retry — you won’t be charged twice or get a duplicate order." : placeErr.message} onRetry={place} /></div> : null}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:static lg:mt-4 lg:border-0 lg:p-0">
              <Button size="lg" className="w-full" onClick={place} busy={placing} disabled={!quote || hasIssues || placing} data-testid="place-order">
                {placing ? "Placing order…" : quote ? `Place order · ${rupees(quote.total)}` : "Checking prices…"}
              </Button>
              {hasIssues ? <p className="mt-1 text-center text-xs font-semibold text-danger">Fix the items marked above to continue.</p> : null}
            </div>
          </section>
        </aside>
      </main>

      <Sheet open={upiOpen} onClose={() => setUpiOpen(false)} title="Simulated UPI payment">
        <div className="space-y-3 text-sm">
          <Notice tone="warn"><strong>Demo only.</strong> This screen stands in for a real UPI app or payment gateway. No money will move.</Notice>
          <p>Amount: <strong className="text-base">{quote ? rupees(quote.total) : "—"}</strong></p>
          <Button className="w-full" onClick={async () => {
            try {
              const r = await api<{ ref: string }>("/payments/simulate", { method: "POST", json: { outcome: "success" } });
              paidRef.current = r.ref; setUpiOpen(false); await place();
            } catch (e: any) { setPlaceErr(e); setUpiOpen(false); }
          }}>Simulate successful payment</Button>
          <Button variant="danger" className="w-full" onClick={async () => {
            try { await api("/payments/simulate", { method: "POST", json: { outcome: "fail" } }); } catch (e: any) { setPlaceErr(e); }
            setUpiOpen(false);
          }}>Simulate failed payment</Button>
        </div>
      </Sheet>
    </>
  );
}
