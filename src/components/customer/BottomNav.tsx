"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconGrid, IconHome, IconList, IconStore } from "../icons";

/** Phone bottom menu: Home · Categories · Orders · Stores. The cart lives in the green bar above it. */
export function BottomNav() {
  const path = usePathname();
  const item = (href: string, label: string, Icon: typeof IconHome, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-bold text-ink" : "font-medium text-ink-2"}`}>
      <Icon className={`h-6 w-6 ${active ? "text-brand" : ""}`} />{label}
    </Link>
  );
  return (
    <nav aria-label="Shop" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {item("/", "Home", IconHome, path === "/")}
        {item("/category/fruits-vegetables", "Categories", IconGrid, path.startsWith("/category") || path.startsWith("/search"))}
        {item("/orders", "Orders", IconList, path.startsWith("/orders"))}
        {item("/stores", "Stores", IconStore, path === "/stores")}
      </div>
    </nav>
  );
}
