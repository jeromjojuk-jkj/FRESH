"use client";
import Link from "next/link";
import { useApi } from "@/lib/client/hooks";
import { rupees } from "@/lib/money";
import { CustomerHeader } from "@/components/customer/Shell";
import { BottomNav } from "@/components/customer/BottomNav";
import { Skeleton } from "@/components/ui";
import { COMPANY } from "@/lib/legal";

const FAQ: [string, string][] = [
  ["How fast is delivery?", "We show an estimated window for your address before you order, based on the store’s packing time, how busy it is, rider availability and travel time. It’s an estimate, not a promise, and we update it if anything changes."],
  ["Which stores can I order from?", "Only partner supermarkets within 3 km of your delivery address. Each store has its own prices and stock, and one cart holds items from one store."],
  ["What charges will I pay?", "Your cart shows every charge before you pay: item total, delivery fee (free above the store’s limit), a ₹5 handling charge, a ₹15 small-cart fee on carts under ₹99, and any tip you choose. Nothing is added later."],
  ["Can I cancel my order?", "Yes, until the store starts packing it. Open the order and tap Cancel order. If you paid online, the full amount is refunded."],
  ["An item was missing, damaged or wrong. What do I do?", "Open the order within 48 hours of delivery and tap Get help with this order. Refunds for items up to ₹500 are approved straight away; others are reviewed within 24 hours."],
  ["What happens if an item is unavailable while packing?", "You choose at checkout: we contact you to pick a replacement, or we remove it. We never swap items or raise your total without asking."],
  ["How do coupons work?", "Open Apply coupon in your cart to see every offer and whether it works for your cart. One coupon per order. Coupons can’t be exchanged for cash."],
  ["What is KripFresh Plus?", "A monthly membership with free delivery above ₹99, no small-cart fee and a members-only coupon. You can cancel any time; benefits last until the end of the month you paid for."],
  ["Does my tip go to the rider?", "Yes, 100% of your tip goes to the delivery partner who brings your order."],
];

export default function HelpPage() {
  const t = useApi<{ tickets: any[] }>("/support/tickets");
  return (
    <>
      <CustomerHeader back="/account" title="Help & support" />
      <main id="main" className="mx-auto max-w-3xl space-y-6 px-4 pb-32 pt-4 lg:pb-12">
        <section className="rounded-[24px] bg-gradient-to-br from-head to-white p-5">
          <h1 className="text-xl font-bold">How can we help?</h1>
          <p className="mt-1 text-sm text-ink-2">For a problem with an order, open it from <Link href="/orders" className="font-semibold text-brand underline">Your orders</Link> and tap <b>Get help with this order</b>. It’s the fastest way to a refund.</p>
        </section>

        <section aria-labelledby="req-h" className="space-y-2">
          <h2 id="req-h" className="text-lg font-bold">Your support requests</h2>
          {!t.data ? <Skeleton className="h-16" /> : t.data.tickets.length === 0 ? <p className="rounded-2xl bg-tile p-4 text-sm text-ink-2">No requests yet.</p> : (
            <ul className="space-y-2">
              {t.data.tickets.map((x) => (
                <li key={x.id}>
                  <Link href={`/orders/${x.code}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 text-sm hover:bg-tile">
                    <span className="min-w-0 flex-1"><b>#{x.id} · {x.kindLabel}</b><span className="block text-ink-2">Order {x.code}{x.items?.length ? ` · ${x.items.map((i: any) => i.name).join(", ")}` : ""}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${x.status === "refund_approved" ? "bg-offbg text-brand" : "bg-warn-bg text-warn"}`}>{x.status === "refund_approved" ? `${rupees(x.refundAmount)} refunded` : "In review"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="faq-h" className="space-y-2">
          <h2 id="faq-h" className="text-lg font-bold">Frequently asked questions</h2>
          <div className="divide-y divide-line overflow-hidden rounded-[20px] border border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold hover:bg-tile">{q}<span className="text-xl text-ink-2 transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
                <p className="px-4 pb-4 text-sm text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="contact-h" className="rounded-[20px] bg-tile p-4 text-sm">
          <h2 id="contact-h" className="mb-2 font-bold">Contact us</h2>
          <p>Customer care: <span className="font-semibold select-all">{COMPANY.supportEmail}</span> · <span className="font-semibold select-all">{COMPANY.supportPhone}</span> ({COMPANY.supportHours})</p>
          <p className="mt-1">Not happy with our answer? Write to our <Link href="/legal/grievance" className="font-semibold text-brand underline">Grievance Officer</Link>.</p>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
