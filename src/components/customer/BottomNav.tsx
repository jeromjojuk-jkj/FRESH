"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cart, cartTotals } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { IconBag, IconGrid, IconHome, IconList, IconStore } from "../icons";

/** Phone bottom bar: Home · Grocery · Cart (centre) · Orders · Stores. Hidden on desktop. */
export function BottomNav() {
  const path = usePathname();
  const c = cart.use();
  const hydrated = useHydrated();
  const count = hydrated ? cartTotals(c).count : 0;
  const item = (href: string, label: string, Icon: typeof IconHome, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-bold text-brand" : "font-medium text-ink-2"}`}>
      <Icon className="h-6 w-6" />{label}
    </Link>
  );
  return (
    <nav aria-label="Shop" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-18px_rgba(0,0,0,.35)] lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
        {item("/", "Home", IconHome, path === "/")}
        {item("/category/fruits-vegetables", "Grocery", IconGrid, path.startsWith("/category") || path.startsWith("/search"))}
        <Link href="/cart" aria-current={path === "/cart" ? "page" : undefined} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          className="flex -translate-y-3.5 flex-col items-center gap-0.5 text-[11px] font-semibold text-ink">
          <span className="relative grid h-14 w-14 place-items-center rounded-[18px] bg-brand text-white shadow-[var(--shadow-lift)]">
            <IconBag className="h-6 w-6" />
            {count ? <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-heart px-1.5 text-center text-[11px] font-bold leading-5 text-white">{count}</span> : null}
          </span>
          Cart
        </Link>
        {item("/orders", "Orders", IconList, path.startsWith("/orders"))}
        {item("/stores", "Stores", IconStore, path === "/stores")}
      </div>
    </nav>
  );
}
