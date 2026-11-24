"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setup, cart, cartTotals } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { CustomerHeader, DemoFab } from "./Shell";
import { CartBar, CartSummary } from "./Cart";
import { Skeleton } from "../ui";

/**
 * Layout for shopping screens. Requires a confirmed address and a selected store;
 * otherwise sends the customer to the right step. Desktop gets a cart summary column.
 */
export function ShopFrame({ children, back, title, sidebar = true }: { children: (storeId: string) => React.ReactNode; back?: string; title?: string; sidebar?: boolean }) {
  const s = setup.use();
  const c = cart.use();
  const hydrated = useHydrated();
  const router = useRouter();
  useEffect(() => {
    if (!hydrated) return;
    if (!s.address) router.replace("/");
    else if (!s.storeId) router.replace("/stores?auto=1");
  }, [hydrated, s.address, s.storeId, router]);
  const ready = hydrated && s.address && s.storeId;
  const raised = hydrated && cartTotals(c).count > 0;
  return (
    <>
      <CustomerHeader back={back} title={title} />
      <div className={`mx-auto max-w-6xl px-4 pb-32 pt-4 lg:pb-10 ${sidebar ? "lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6" : ""}`}>
        <main id="main" className="min-w-0">
          {ready ? children(s.storeId!) : <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-20" /><Skeleton className="h-64" /></div>}
        </main>
        {sidebar ? <div><CartSummary /></div> : null}
      </div>
      <CartBar />
      <DemoFab raised={raised} />
    </>
  );
}
