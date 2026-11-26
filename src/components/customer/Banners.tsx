"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { rupees } from "@/lib/money";

/** Swipeable offer banners. They never move on their own; dots follow the customer's swipe. */
export function Banners({ storeName, eta, freeAbove }: { storeName: string; eta: string | null; freeAbove?: number }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const slides = [
    { cls: "text-white bg-[radial-gradient(90%_120%_at_100%_0%,#5ED47C_0%,transparent_60%),linear-gradient(135deg,#1E9E45,#127A33)]", btn: "text-[#127A33]",
      h: "Fresh & healthy fruits & veggies", p: `Picked every morning. Delivered from ${storeName}${eta ? ` in ${eta}` : ""}.`, cta: "Order now", href: "/category/fruits-vegetables", img: "/img/p/broccoli.webp" },
    { cls: "text-[#2B2100] bg-[linear-gradient(135deg,#F7C232,#FFD95E)]", btn: "text-[#2B2100]",
      h: "Free delivery on bigger baskets", p: freeAbove ? `Orders above ${rupees(freeAbove)} from ${storeName} ship free.` : `Big baskets from ${storeName} ship free.`, cta: "Shop staples", href: "/category/rice-grains", img: "/img/p/rice.webp" },
    { cls: "text-[#10284D] bg-[linear-gradient(135deg,#DCEBFF,#BFD9FF)]", btn: "text-[#10284D]",
      h: "Breakfast in minutes", p: "Milk, curd, eggs and bread from the store’s fridge.", cta: "Shop dairy", href: "/category/dairy-eggs", img: "/img/p/milk.webp" },
  ];
  return (
    <section aria-label="Offers" className="space-y-2.5">
      <div ref={track} onScroll={(e) => { const t = e.currentTarget; const w = (t.firstElementChild as HTMLElement)?.offsetWidth ?? 1; setActive(Math.round(t.scrollLeft / (w + 12))); }}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {slides.map((s, i) => (
          <div key={s.h} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}
            className={`relative grid min-h-[190px] w-[88%] max-w-[560px] shrink-0 snap-start content-center gap-2 overflow-hidden rounded-3xl px-5 py-6 ${s.cls}`}>
            <h2 className="max-w-[78%] text-2xl font-extrabold uppercase leading-[1.05] tracking-tight">{s.h}</h2>
            <p className="max-w-[62%] text-[13px] opacity-95">{s.p}</p>
            <Link href={s.href} className={`mt-1 inline-flex min-h-[42px] w-fit items-center rounded-full bg-white px-5 text-[15px] font-bold ${s.btn}`}>{s.cta}</Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt="" className="pointer-events-none absolute -bottom-3.5 -right-2.5 w-[42%] max-w-[170px] drop-shadow-[0_10px_16px_rgba(0,0,0,.2)]" />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {slides.map((s, i) => <span key={s.h} className={`h-2 rounded-full transition-all ${i === active ? "w-7 bg-brand" : "w-2 bg-[#D5DAD6]"}`} />)}
      </div>
    </section>
  );
}
