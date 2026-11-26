"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cart, cartTotals } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { IconBag, IconGrid, IconHome, IconList, IconSearch } from "../icons";

/** Phone bottom bar: Home · Categories · (Search) · Cart · Orders. */
export function BottomNav() {
  const path = usePathname();
  const c = cart.use();
  const hydrated = useHydrated();
  const count = hydrated ? cartTotals(c).count : 0;
  const item = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11.5px] ${active ? "font-bold text-brand" : "font-medium text-ink-2"}`}>
      {icon}{label}
    </Link>
  );
  return (
    <nav aria-label="Shop" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
        {item("/", "Home", <IconHome className="h-6 w-6" />, path === "/")}
        {item("/category/fruits-vegetables", "Categories", <IconGrid className="h-6 w-6" />, path.startsWith("/category"))}
        <Link href="/search" aria-label="Search products" aria-current={path.startsWith("/search") ? "page" : undefined} className="flex justify-center">
          <span className="grid h-16 w-16 -translate-y-4 place-items-center rounded-[22px] bg-brand text-white shadow-[0_0_0_6px_#fff,0_10px_20px_-8px_rgba(0,0,0,.35)]"><IconSearch className="h-7 w-7" /></span>
        </Link>
        {item("/cart", "Cart", (
          <span className="relative">
            <IconBag className="h-6 w-6" />
            {count ? <span className="absolute -right-3 -top-2 min-w-[18px] rounded-full bg-heart px-1 text-center text-[10px] font-bold leading-[18px] text-white">{count}</span> : null}
          </span>
        ), path === "/cart")}
        {item("/orders", "Orders", <IconList className="h-6 w-6" />, path.startsWith("/orders"))}
      </div>
    </nav>
  );
}
