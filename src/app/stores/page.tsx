"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client/api";
import { cart, setup, type CartItem } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { rupees } from "@/lib/money";
import type { Quote, StoreSummary } from "@/lib/types";
import { CustomerHeader } from "@/components/customer/Shell";
import { useNearbyStores } from "@/components/customer/useStores";
import { Button, ErrorBox, Notice, Sheet, Skeleton } from "@/components/ui";
import { IconClock, IconPin, IconStore } from "@/components/icons";

export default function StoresPage() {
  return <Suspense><StoresInner /></Suspense>;
}

function StoresInner() {
  const hydrated = useHydrated();
  const s = setup.use();
  const c = cart.use();
  const router = useRouter();
  const params = useSearchParams();
  const auto = params.get("auto") === "1";
  const { stores, error, retry } = useNearbyStores(hydrated ? s.address : null);
  const [compare, setCompare] = useState<{ target: StoreSummary; quote: Quote | null; error?: string } | null>(null);
  const decided = useRef(false);

  const cartCount = Object.values(c.items).reduce((n, i) => n + i.qty, 0);
  const cartStore = stores?.find((x) => x.id === c.storeId);
  const eligible = stores?.filter((x) => x.eligible) ?? [];

  const commit = (st: StoreSummary, items?: Record<string, CartItem>) => {
    setup.set((v) => ({ ...v, storeId: st.id, storeName: st.name }));
    if (items) cart.set(() => ({ storeId: st.id, items, updatedAt: Date.now() }));
    router.push("/");
  };

  const choose = async (st: StoreSummary) => {
    if (!cartCount || c.storeId === st.id) return commit(st, cartCount ? undefined : {});
    setCompare({ target: st, quote: null });
    try {
      const r = await api<{ quote: Quote }>("/cart/quote", { method: "POST", json: { storeId: st.id, items: Object.entries(c.items).map(([productId, it]) => ({ productId, qty: it.qty })), location: s.address } });
      setCompare({ target: st, quote: r.quote });
    } catch (e: any) {
      setCompare({ target: st, quote: null, error: e.message });
    }
  };

  // After confirming an address: keep the current store if it still delivers,
  // otherwise suggest the fastest one. Never touch a non-empty cart without asking.
  useEffect(() => {
    if (!auto || !stores || decided.current) return;
    decided.current = true;
    const current = stores.find((x) => x.id === s.storeId && x.eligible);
    if (current && (!cartCount || c.storeId === current.id)) return commit(current);
    const fastest = eligible[0];
    if (!fastest) return;
    if (!cartCount) return commit(fastest, {});
    if (c.storeId === fastest.id) return commit(fastest);
    // Cart belongs to a store that can't serve this address: stay here and explain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, stores]);

  if (!hydrated) return null;
  if (!s.address) { router.replace("/"); return null; }

  return (
    <>
      <CustomerHeader back="/" title="Choose a supermarket" />
      <main id="main" className="mx-auto max-w-2xl px-4 pb-10 pt-4">
        <p className="mb-4 flex items-start gap-2 text-sm text-ink-2"><IconPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Delivering to <strong className="font-semibold text-ink">{s.address.flat ? `${s.address.flat}, ` : ""}{s.address.line}</strong></p>
        {error ? <ErrorBox message={error.message} onRetry={retry} /> : !stores ? (
          <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        ) : eligible.length === 0 ? (
          <NoStores stores={stores} cartCount={cartCount} cartStoreName={cartStore?.name} />
        ) : (
          <>
            {cartCount > 0 && c.storeId && !eligible.some((x) => x.id === c.storeId) ? (
              <div className="mb-4"><Notice tone="warn">Your cart has {cartCount} item{cartCount > 1 ? "s" : ""} from <strong>{cartStore?.name ?? "another store"}</strong>, which can’t deliver to this address now. Choose a store below — we’ll show which items it has before changing anything.</Notice></div>
            ) : null}
            <h2 className="mb-2 text-base font-semibold">{eligible.length} store{eligible.length > 1 ? "s" : ""} deliver here</h2>
            <ul className="space-y-3">
              {eligible.map((st, i) => (
                <li key={st.id}>
                  <button onClick={() => choose(st)} aria-current={st.id === s.storeId ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 p-4 text-left transition-colors hover:bg-mint ${st.id === s.storeId ? "border-brand bg-mint/60" : "border-line"}`} data-testid={`store-${st.id}`}>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-white"><IconStore /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{st.name}</span>
                        {i === 0 ? <span className="rounded-full bg-fresh px-2 py-0.5 text-[11px] font-semibold text-ink">Fastest</span> : null}
                        {st.id === s.storeId ? <span className="rounded-full border border-brand px-2 py-0.5 text-[11px] font-semibold text-brand">Selected</span> : null}
                      </span>
                      <span className="block text-xs text-ink-2">{st.area} · {st.hoursLabel}</span>
                      <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span className="inline-flex items-center gap-1"><IconPin className="h-4 w-4 text-brand" />{st.distanceLabel}</span>
                        <span className="inline-flex items-center gap-1 font-semibold"><IconClock className="h-4 w-4 text-brand" />{st.etaMin}–{st.etaMax} min</span>
                        <span>{st.deliveryFee ? `Delivery ${rupees(st.deliveryFee)}` : "Free delivery"}<span className="text-ink-2"> · free above {rupees(st.freeDeliveryAbove)}</span></span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Unavailable stores={stores.filter((x) => !x.eligible)} />
          </>
        )}
      </main>

      <Sheet open={!!compare} onClose={() => setCompare(null)} title={compare ? `Switch to ${compare.target.name}?` : ""}>
        {compare ? <CompareBody compare={compare} cartStoreName={cartStore?.name ?? s.storeName ?? "your current store"} currentEligible={!!cartStore?.eligible}
          onMove={(items) => commit(compare.target, items)} onClear={() => commit(compare.target, {})} onKeep={() => { setCompare(null); if (cartStore?.eligible) commit(cartStore); }} /> : null}
      </Sheet>
    </>
  );
}

function CompareBody({ compare, cartStoreName, currentEligible, onMove, onClear, onKeep }: {
  compare: { target: StoreSummary; quote: Quote | null; error?: string }; cartStoreName: string; currentEligible: boolean;
  onMove: (items: Record<string, CartItem>) => void; onClear: () => void; onKeep: () => void;
}) {
  const c = cart.get();
  if (compare.error) return <ErrorBox message={compare.error} />;
  if (!compare.quote) return <div className="space-y-2" role="status" aria-label="Checking items"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>;
  const q = compare.quote;
  const ok = q.lines.filter((l) => l.available || (l.stock > 0 && l.price > 0));
  const missing = q.lines.filter((l) => !(l.available || (l.stock > 0 && l.price > 0)));
  const moved: Record<string, CartItem> = {};
  for (const l of ok) moved[l.productId] = { qty: Math.min(l.qty, l.stock), name: l.name, packLabel: l.packLabel, image: l.image, price: l.price };
  return (
    <div className="space-y-4 text-sm">
      <p>Your cart is from <strong>{cartStoreName}</strong>. A cart can only have items from one supermarket, and each store has its own prices and stock.</p>
      {ok.length ? (
        <div>
          <h3 className="mb-1 font-semibold">Available at {compare.target.name} ({ok.length})</h3>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {ok.map((l) => {
              const old = c.items[l.productId]?.price;
              const qty = Math.min(l.qty, l.stock);
              return (
                <li key={l.productId} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>{l.name} <strong>{l.packLabel}</strong> × {qty}{qty < l.qty ? <span className="text-warn"> (only {l.stock} left)</span> : null}</span>
                  <span className="shrink-0 text-right">{old !== undefined && old !== l.price ? <><s className="text-ink-2">{rupees(old)}</s> → </> : null}<strong>{rupees(l.price)}</strong></span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {missing.length ? (
        <div>
          <h3 className="mb-1 font-semibold text-danger">Not available there ({missing.length}) — will be removed</h3>
          <ul className="list-inside list-disc text-ink-2">{missing.map((l) => <li key={l.productId}>{l.name} ({l.packLabel})</li>)}</ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 pt-1">
        {ok.length ? <Button onClick={() => onMove(moved)}>Switch and move {ok.length} item{ok.length > 1 ? "s" : ""}</Button> : null}
        <Button variant="secondary" onClick={onClear}>Switch and start an empty cart</Button>
        {currentEligible ? <Button variant="ghost" onClick={onKeep}>Keep {cartStoreName}</Button> : <Button variant="ghost" onClick={onKeep}>Cancel</Button>}
      </div>
    </div>
  );
}

function Unavailable({ stores }: { stores: StoreSummary[] }) {
  if (!stores.length) return null;
  return (
    <details className="mt-6 rounded-2xl border border-line p-3">
      <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold">Not available for this address ({stores.length})</summary>
      <ul className="mt-2 space-y-2 text-sm">
        {stores.map((st) => <li key={st.id} className="flex justify-between gap-3"><span>{st.name}</span><span className="text-right text-ink-2">{st.reason}</span></li>)}
      </ul>
    </details>
  );
}

function NoStores({ stores, cartCount, cartStoreName }: { stores: StoreSummary[]; cartCount: number; cartStoreName?: string }) {
  const nearest = [...stores].sort((a, b) => a.distanceM - b.distanceM)[0];
  return (
    <section className="rounded-[var(--radius-card)] bg-mint p-6 text-center" aria-live="polite">
      <h2 className="text-lg font-semibold">No supermarkets deliver here yet</h2>
      <p className="mt-2 text-sm text-ink-2">We deliver only from partner stores within 3 km of your address. {nearest ? <>The nearest one, {nearest.name}, is {nearest.distanceLabel} away{nearest.distanceM <= 3000 && nearest.reason ? ` — ${nearest.reason.toLowerCase()}` : ""}.</> : null}</p>
      {cartCount ? <p className="mt-2 text-sm">Your cart ({cartCount} items from {cartStoreName ?? "another store"}) is saved — nothing has been removed.</p> : null}
      <Link href="/address?mode=manual" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-6 font-semibold text-white hover:bg-brand-dark">Change address</Link>
      <Unavailable stores={stores} />
    </section>
  );
}
