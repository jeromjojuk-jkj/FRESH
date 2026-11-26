import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

/** "Shop by category" grid: 4 across on phones, image on a pale tile, name below. */
export function CategoryTiles() {
  return (
    <ul className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-7">
      {CATEGORIES.map((c) => (
        <li key={c.slug}>
          <Link href={`/category/${c.slug}`} className="group flex flex-col items-center gap-1.5 text-center text-[11.5px] font-medium leading-tight text-ink">
            <span className="grid aspect-square w-full place-items-center rounded-2xl bg-cat transition-colors group-hover:bg-mint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" className="h-[62%] w-[62%] object-contain" />
            </span>
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Text tabs across the top: All · Fruits · Dairy · … */
export function CategoryTabs({ current }: { current?: string }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} aria-current={on ? "page" : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center border-b-[3px] px-2.5 text-[13px] ${on ? "border-ink font-bold text-ink" : "border-transparent font-medium text-ink hover:border-line"}`}>
      {label}
    </Link>
  );
  return (
    <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4">
      {tab("/", "All", !current)}
      {CATEGORIES.map((c) => tab(`/category/${c.slug}`, c.name.split(" & ")[0], c.slug === current))}
    </nav>
  );
}
