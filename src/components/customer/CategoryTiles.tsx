import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

const TILE = ["bg-[#FFF1CF]", "bg-t0", "bg-t2", "bg-t4", "bg-t3", "bg-t1", "bg-[#FFF1CF]"];

/** "Shop by category": a swipeable row of pastel tiles with the name underneath. */
export function CategoryTiles() {
  return (
    <ul className="no-scrollbar -mx-4 flex gap-3.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
      {CATEGORIES.map((c, i) => (
        <li key={c.slug} className="w-[92px] shrink-0 sm:w-auto">
          <Link href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2 text-center text-[13px] font-medium leading-tight text-ink">
            <span className={`grid aspect-square w-full place-items-center rounded-[20px] shadow-[inset_0_-6px_0_rgba(0,0,0,.05)] ${TILE[i % TILE.length]} transition-transform group-hover:-translate-y-0.5`}>
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

/** Pill chips for switching category on category pages. */
export function CategoryTabs({ current }: { current?: string }) {
  return (
    <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {CATEGORIES.map((c) => (
        <Link key={c.slug} href={`/category/${c.slug}`} aria-current={c.slug === current ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] px-4 text-[13px] font-semibold ${c.slug === current ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"}`}>
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
