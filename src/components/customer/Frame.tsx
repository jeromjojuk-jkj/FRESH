"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setup } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import Link from "next/link";
import { CustomerHeader } from "./Shell";
import { CartBar, CartSummary } from "./Cart";
import { BottomNav } from "./BottomNav";
import { Skeleton } from "../ui";
import { useNearbyStores } from "./useStores";
import { EtaContext } from "./ProductCard";

/**
 * Layout for shopping screens. Requires a confirmed address and a selected store;
 * otherwise sends the customer to the right step. Desktop gets a cart summary column.
 */
export function ShopFrame({ children, back, title, sidebar = true, ownHeader = false }: { children: (storeId: string) => React.ReactNode; back?: string; title?: string; sidebar?: boolean; ownHeader?: boolean }) {
  const s = setup.use();
  const hydrated = useHydrated();
  const router = useRouter();
  useEffect(() => {
    if (!hydrated) return;
    if (!s.address) router.replace("/");
    else if (!s.storeId) router.replace("/stores?auto=1");
  }, [hydrated, s.address, s.storeId, router]);
  const ready = hydrated && s.address && s.storeId;
  const { stores } = useNearbyStores(ready ? s.address : null);
  const eta = stores?.find((x) => x.id === s.storeId)?.etaMin ?? null;
  return (
    <>
      {ownHeader ? null : <CustomerHeader back={back} title={title} />}
      <div className={`mx-auto max-w-6xl px-4 pb-44 pt-4 lg:pb-10 ${sidebar ? "lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6" : ""}`}>
        <main id="main" className="min-w-0">
          {ready ? <EtaContext.Provider value={eta}>{children(s.storeId!)}</EtaContext.Provider> : <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-20" /><Skeleton className="h-64" /></div>}
          <p className="mt-10 text-center sm:hidden"><Link href="/demo" className="inline-flex min-h-11 items-center rounded-full border border-dashed border-brand px-4 text-xs font-semibold uppercase tracking-wide text-brand">Demo switcher</Link></p>
        </main>
        {sidebar ? <div><CartSummary /></div> : null}
      </div>
      <CartBar />
      <BottomNav />
    </>
  );
}
