import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

const TILE_BG = ["bg-p1", "bg-p2", "bg-p3", "bg-p4", "bg-p5", "bg-p6", "bg-p7"];

export function CategoryTiles({ current }: { current?: string }) {
  return (
    <ul className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
      {CATEGORIES.map((c, i) => (
        <li key={c.slug} className="shrink-0">
          <Link href={`/category/${c.slug}`} aria-current={c.slug === current ? "page" : undefined}
            className={`flex h-full w-[84px] flex-col items-center gap-1.5 rounded-[20px] px-1.5 pb-2 pt-2.5 text-center text-xs font-medium leading-tight text-ink sm:w-auto ${TILE_BG[i % 7]} ${c.slug === current ? "ring-2 ring-brand" : "hover:brightness-[.97]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image} alt="" className="h-11 w-11 object-contain" />
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
