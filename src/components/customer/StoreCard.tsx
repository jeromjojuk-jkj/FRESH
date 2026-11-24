"use client";
import Link from "next/link";
import type { StoreSummary } from "@/lib/types";
import { rupees } from "@/lib/money";
import { IconClock, IconPin, IconStore } from "../icons";
import { Skeleton } from "../ui";

export function StoreCard({ store, name }: { store: StoreSummary | null | undefined; name: string | null }) {
  if (!store) return <Skeleton className="h-[76px]" />;
  return (
    <section className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-mint/60 p-3" aria-label="Selected supermarket">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-white"><IconStore /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{store.name ?? name}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1"><IconPin className="h-3.5 w-3.5" />{store.distanceLabel}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-ink"><IconClock className="h-3.5 w-3.5" />{store.etaMin}–{store.etaMax} min</span>
          <span>{store.deliveryFee ? `Delivery ${rupees(store.deliveryFee)} · free above ${rupees(store.freeDeliveryAbove)}` : "Free delivery"}</span>
        </p>
        {!store.eligible ? <p className="mt-0.5 text-xs font-semibold text-danger">{store.reason}</p> : null}
      </div>
      <Link href="/stores" className="inline-flex min-h-11 shrink-0 items-center rounded-xl border-2 border-brand bg-white px-3 text-sm font-semibold text-brand hover:bg-mint">Change store</Link>
    </section>
  );
}
