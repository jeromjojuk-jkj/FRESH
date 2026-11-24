"use client";
import Link from "next/link";
import { useApi, useNow } from "@/lib/client/hooks";
import { ago } from "@/lib/format";
import { rupees } from "@/lib/money";
import { CustomerHeader } from "@/components/customer/Shell";
import { BottomNav } from "@/components/customer/BottomNav";
import { ErrorBox, Skeleton } from "@/components/ui";
import { IconChevron } from "@/components/icons";

export default function OrdersPage() {
  const { data, error, reload } = useApi<{ orders: any[] }>("/orders", { pollMs: 15000 });
  const now = useNow();
  return (
    <>
      <CustomerHeader back="/" title="Your orders" />
      <main id="main" className="mx-auto max-w-2xl px-4 pb-28 pt-4">
        {error ? <ErrorBox message={error.message} onRetry={reload} /> : !data ? <Skeleton className="h-40" /> : data.orders.length === 0 ? (
          <div className="rounded-2xl bg-mint p-8 text-center">
            <p className="font-semibold">No orders yet</p>
            <Link href="/" className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-brand px-6 font-semibold text-white">Start shopping</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.orders.map((o) => {
              const active = !["delivered", "declined", "cancelled"].includes(o.status);
              return (
                <li key={o.code}>
                  <Link href={`/orders/${o.code}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line p-4 hover:bg-mint">
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong>{o.code}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.status === "declined" ? "bg-danger-bg text-danger" : active ? "bg-fresh text-ink" : "bg-mint text-ink"}`}>{o.statusLabel}</span>
                      </span>
                      <span className="block text-sm text-ink-2">{o.storeName} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {rupees(o.total)} · {ago(o.createdAt, now)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">{active ? "Track" : "View"} <IconChevron className="h-4 w-4" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav />
    </>
  );
}
