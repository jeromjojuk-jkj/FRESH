"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cart, cartTotals, setQty } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { rupees } from "@/lib/money";
import { IconBag, IconChevron } from "../icons";
import { QtyStepper } from "../ui";

/** Sticky bottom bar on phones; appears once the first item is added. */
export function CartBar() {
  const c = cart.use();
  const hydrated = useHydrated();
  const path = usePathname();
  const t = cartTotals(c);
  if (!hydrated || t.count === 0 || path === "/cart") return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <Link href="/cart" className="fade-in mx-auto flex min-h-16 max-w-xl items-center gap-3 rounded-2xl bg-brand px-4 text-white shadow-[0_10px_30px_-10px_rgba(23,99,58,.7)]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><IconBag /></span>
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-medium">{t.count} item{t.count > 1 ? "s" : ""}</span>
          <span className="block text-base font-bold">{rupees(t.subtotal)}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-base font-semibold">View cart <IconChevron className="h-5 w-5" /></span>
      </Link>
    </div>
  );
}

/** Desktop: always-visible cart summary beside the product grid. */
export function CartSummary() {
  const c = cart.use();
  const hydrated = useHydrated();
  const t = cartTotals(c);
  const items = Object.entries(c.items);
  return (
    <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col rounded-[var(--radius-card)] border border-line bg-white lg:flex" aria-label="Your cart">
      <h2 className="border-b border-line px-4 py-3 text-base font-semibold">Your cart {hydrated && t.count ? `· ${t.count} item${t.count > 1 ? "s" : ""}` : ""}</h2>
      {!hydrated || !items.length ? (
        <p className="px-4 py-6 text-sm text-ink-2">Your cart is empty. Tap <strong className="text-ink">Add</strong> on any product to start.</p>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-4">
            {items.map(([pid, it]) => (
              <li key={pid} className="flex items-center gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-mint object-contain p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-ink-2"><strong className="font-semibold text-ink">{it.packLabel}</strong> · {rupees(it.price)}</p>
                </div>
                <div className="w-28 shrink-0"><QtyStepper qty={it.qty} label={`${it.name}, ${it.packLabel}`} onChange={(n) => setQty(c.storeId!, pid, n)} /></div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-4">
            <div className="mb-3 flex justify-between text-sm"><span>Item total</span><strong>{rupees(t.subtotal)}</strong></div>
            <Link href="/cart" className="flex min-h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-white hover:bg-brand-dark">Go to checkout</Link>
          </div>
        </>
      )}
    </aside>
  );
}
