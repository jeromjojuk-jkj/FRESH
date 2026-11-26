"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cart, cartTotals, setup } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { rupees } from "@/lib/money";
import { CATEGORIES, type StoreSummary } from "@/lib/types";
import { Logo } from "../Logo";
import { IconBag, IconChevron, IconClock, IconList, IconPin, IconUser } from "../icons";
import { SearchBox } from "./SearchBox";
import { useNearbyStores } from "./useStores";

/** Desktop website header: delivery strip, logo + location + search + orders + cart, category menu. */
export function SiteHeader({ storeId: sid, store: given }: { storeId?: string; store?: StoreSummary }) {
  const s = setup.use();
  const storeId = sid ?? s.storeId ?? "";
  const { stores } = useNearbyStores(given || !storeId ? null : s.address);
  const store = given ?? stores?.find((x) => x.id === storeId);
  const c = cart.use();
  const hydrated = useHydrated();
  const path = usePathname();
  const t = hydrated ? cartTotals(c) : { count: 0, subtotal: 0 };
  const a = s.address;
  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-white lg:block">
      <div className="bg-brand text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-1.5 text-[13px]">
          <span className="inline-flex items-center gap-1.5 font-semibold"><IconClock className="h-4 w-4" />{store ? `Delivery in ${store.etaMin}–${store.etaMax} min from ${store.name}` : "Delivery from your neighbourhood supermarket"}</span>
          {store ? <span className="text-white/85">{store.deliveryFee ? `Free delivery above ${rupees(store.freeDeliveryAbove)}` : "Free delivery"} · Only stores within 3 km</span> : null}
          <span className="ml-auto flex items-center gap-4">
            <Link href="/stores" className="hover:underline">Change store</Link>
            <Link href="/demo" className="rounded-full border border-dashed border-white/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/10">Demo switcher</Link>
          </span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-6 py-3">
        <Link href="/" aria-label="KripFresh home" className="shrink-0"><Logo /></Link>
        <Link href="/address" className="flex min-h-12 w-60 shrink-0 items-center gap-2 rounded-xl border border-line px-3 hover:border-brand" aria-label="Change delivery address">
          <IconPin className="h-5 w-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[11px] font-medium text-ink-2">Deliver to {a?.label ?? ""}</span>
            <span className="block truncate text-[13px] font-semibold">{a ? [a.flat, a.line].filter(Boolean).join(", ") : "Set your address"}</span>
          </span>
          <IconChevron className="h-4 w-4 shrink-0 rotate-90 text-ink-2" />
        </Link>
        <div className="min-w-0 flex-1">{storeId ? <SearchBox storeId={storeId} compact /> : null}</div>
        <Link href="/orders" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-mint"><IconList className="h-5 w-5 text-brand" />Orders</Link>
        <Link href="/account" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-mint"><IconUser className="h-5 w-5 text-brand" />Account</Link>
        <Link href="/cart" className="inline-flex min-h-12 shrink-0 items-center gap-2.5 rounded-xl bg-brand px-4 text-white hover:bg-brand-dark" aria-label={`Cart, ${t.count} items, ${rupees(t.subtotal)}`}>
          <IconBag className="h-5 w-5" />
          <span className="leading-tight">{t.count ? <><span className="block text-[11px] font-medium text-white/90">{t.count} item{t.count > 1 ? "s" : ""}</span><span className="block text-sm font-bold">{rupees(t.subtotal)}</span></> : <span className="text-sm font-semibold">My cart</span>}</span>
        </Link>
      </div>
      <nav aria-label="Shop by category" className="border-t border-line">
        <ul className="mx-auto flex max-w-7xl gap-1 px-4">
          {CATEGORIES.map((cat) => {
            const on = path === `/category/${cat.slug}`;
            return (
              <li key={cat.slug}>
                <Link href={`/category/${cat.slug}`} aria-current={on ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 border-b-[3px] px-3 text-[13.5px] font-medium ${on ? "border-brand text-brand" : "border-transparent text-ink hover:text-brand"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.image} alt="" className="h-5 w-5 object-contain" />{cat.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

/** Website footer, shown on every shopping page. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line bg-tile">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-ink-2">Groceries from supermarkets within 3 km of you, packed by the store and delivered in minutes.</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">Shop</h2>
          <ul className="grid gap-1.5 text-sm">{CATEGORIES.map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="text-ink-2 hover:text-brand">{c.name}</Link></li>)}</ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">Your account</h2>
          <ul className="grid gap-1.5 text-sm text-ink-2">
            <li><Link href="/orders" className="hover:text-brand">Your orders</Link></li>
            <li><Link href="/cart" className="hover:text-brand">Cart</Link></li>
            <li><Link href="/address" className="hover:text-brand">Delivery address</Link></li>
            <li><Link href="/stores" className="hover:text-brand">Choose a store</Link></li>
            <li><Link href="/account" className="hover:text-brand">Account &amp; Plus</Link></li>
            <li><Link href="/help" className="hover:text-brand">Help &amp; support</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">For partners</h2>
          <ul className="grid gap-1.5 text-sm text-ink-2">
            <li><Link href="/store" className="hover:text-brand">Store dashboard</Link></li>
            <li><Link href="/rider" className="hover:text-brand">Delivery partner app</Link></li>
            <li><Link href="/demo" className="hover:text-brand">Demo switcher</Link></li>
          </ul>
          <p className="mt-4 text-xs text-ink-2">Payments: cash on delivery, UPI (simulated in this demo).</p>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-ink-2">
        <nav aria-label="Policies" className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {[["terms", "Terms of use"], ["privacy", "Privacy"], ["refunds", "Refunds & cancellation"], ["delivery", "Delivery policy"], ["grievance", "Grievance officer"]].map(([k, l]) => <Link key={k} href={`/legal/${k}`} className="hover:text-brand">{l}</Link>)}
        </nav>
        © {new Date().getFullYear()} KripFresh · Demo website with fictional stores. No real orders are placed.
      </div>
    </footer>
  );
}
