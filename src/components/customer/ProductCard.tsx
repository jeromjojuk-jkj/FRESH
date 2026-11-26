"use client";
import { createContext, useEffect, useMemo, useState } from "react";
import type { CatalogueProduct } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { rupees } from "@/lib/money";
import { api } from "@/lib/client/api";
import { cart, setQty } from "@/lib/client/store";
import { Button, Sheet } from "../ui";
import { IconMinus, IconPlus } from "../icons";

export function groupVariants(products: CatalogueProduct[]): CatalogueProduct[][] {
  const map = new Map<string, CatalogueProduct[]>();
  for (const p of products) {
    const k = p.groupKey || p.productId;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  return [...map.values()].map((v) => v.sort((a, b) => a.price - b.price));
}

export function addToCart(storeId: string, p: Pick<CatalogueProduct, "productId" | "name" | "packLabel" | "image" | "price" | "stock">, qty: number) {
  const c = cart.get();
  if (qty > 0 && c.storeId && c.storeId !== storeId && Object.keys(c.items).length) {
    // Store switching asks first, so this is a safety net: never mix stores silently.
    if (!window.confirm("Your cart has items from another supermarket. Start a new cart from this store? Your old cart will be cleared.")) return;
  }
  setQty(storeId, p.productId, Math.min(qty, p.stock), { name: p.name, packLabel: p.packLabel, image: p.image, price: p.price });
}

/** Kept for screens that show the store's delivery time; cards no longer use it. */
export const EtaContext = createContext<number | null>(null);

export const offPct = (p: Pick<CatalogueProduct, "mrp" | "price">) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);

// Soft pastel backgrounds for product pictures, stable per product.
const TINTS = ["bg-t0", "bg-t1", "bg-t2", "bg-t3", "bg-t4"];
export function tintFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? "";

export function ProductCard({ variants, storeId }: { variants: CatalogueProduct[]; storeId: string }) {
  const c = cart.use();
  const inCart = (id: string) => (c.storeId === storeId ? c.items[id]?.qty ?? 0 : 0);
  const initial = useMemo(
    () => variants.find((v) => inCart(v.productId) > 0) ?? variants.find((v) => v.inStock) ?? variants[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variants],
  );
  const [selId, setSelId] = useState(initial.productId);
  const [detail, setDetail] = useState(false);
  const p = variants.find((v) => v.productId === selId) ?? variants[0];
  const qty = inCart(p.productId);
  const label = `${p.name}, ${p.packLabel}`;
  const pct = offPct(p);

  return (
    <article className="relative flex h-full flex-col rounded-[20px] bg-white px-2 pb-3 pt-2 shadow-[0_4px_18px_-10px_rgba(0,0,0,.22)]" aria-label={label}>
      <button type="button" onClick={() => setDetail(true)} aria-label={`Details for ${label}`}
        className={`relative grid aspect-[1.05] w-full place-items-center rounded-2xl ${tintFor(p.productId)} ${p.inStock ? "" : "opacity-60 grayscale"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" width={256} height={256} loading="lazy" decoding="async" className="h-[58%] w-[58%] object-contain" />
        {!p.inStock ? <span className="absolute inset-x-3 bottom-2 rounded-lg bg-white/95 py-0.5 text-center text-xs font-semibold text-ink">Out of stock</span> : null}
      </button>
      {pct >= 1 && p.inStock ? (
        <span className="absolute left-2 top-2 rounded-br-2xl rounded-tl-2xl bg-offbg px-2 py-1.5 text-[13px] font-extrabold leading-[1.05] text-brand">{pct}%<br />OFF</span>
      ) : null}
      {p.popular ? <span className="absolute right-3.5 top-4 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand shadow-[var(--shadow-soft)]">★ Popular</span> : null}

      <h3 className="mx-1.5 mt-2.5 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-[1.3] text-ink">{p.name}</h3>
      {variants.length > 1 ? (
        <div className="mx-1.5 mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-label={`Pack size for ${p.name}`}>
          {variants.map((v) => {
            const on = v.productId === p.productId;
            const n = inCart(v.productId);
            return (
              <button key={v.productId} type="button" role="radio" aria-checked={on} onClick={() => setSelId(v.productId)}
                className={`min-h-8 rounded-[10px] border-[1.5px] px-2 text-xs font-semibold ${on ? "border-brand bg-mint text-ink" : "border-line bg-white text-ink-2 hover:border-brand"}`}>
                {v.packLabel}{n ? ` · ${n}` : ""}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mx-1.5 mt-1 text-[13px] text-ink-2">{p.packLabel}</p>
      )}

      <div className="mx-1.5 mt-auto flex items-end justify-between gap-1.5 pt-3">
        <span className="min-w-0 leading-[1.1]">
          <span className="block text-lg font-extrabold text-ink">{rupees(p.price)}</span>
          {p.mrp > p.price ? <span className="text-[11.5px] text-ink-2 line-through">MRP {rupees(p.mrp)}</span> : null}
        </span>
        {!p.inStock ? (
          <span className="pb-2 text-xs font-semibold text-ink-2">Sold out</span>
        ) : qty > 0 ? (
          <div className="flex h-11 min-w-[84px] shrink-0 items-center rounded-[14px] bg-brand text-white" role="group" aria-label={`Quantity of ${label}`}>
            <button type="button" onClick={() => addToCart(storeId, p, qty - 1)} className="grid h-11 w-8 place-items-center" aria-label={qty === 1 ? `Remove ${label}` : `Decrease ${label}`}><IconMinus className="h-4 w-4" /></button>
            <output className="flex-1 text-center font-extrabold" aria-live="polite">{qty}</output>
            <button type="button" onClick={() => addToCart(storeId, p, qty + 1)} disabled={qty >= p.stock} className="grid h-11 w-8 place-items-center disabled:opacity-40" aria-label={`Increase ${label}`}><IconPlus className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => addToCart(storeId, p, 1)} aria-label={`Add ${label} to cart`}
            className="h-11 min-w-[72px] shrink-0 rounded-[14px] border-[1.5px] border-brand bg-white px-3 text-[15px] font-extrabold text-brand hover:bg-mint">
            ADD
          </button>
        )}
      </div>
      {p.inStock && p.stock <= 5 ? <p className="mx-1.5 mt-1 text-[11px] font-semibold text-warn">Only {p.stock} left</p> : null}

      <ProductSheet open={detail} onClose={() => setDetail(false)} storeId={storeId} variants={variants} selectedId={p.productId} onSelect={setSelId} />
    </article>
  );
}

const CATEGORY_NOTE: Record<string, string> = {
  "fruits-vegetables": "Fresh produce is checked by the store when packing. If it doesn’t look right, staff follow your choice at checkout: contact you, or remove it.",
  "dairy-eggs": "Kept chilled at the store and packed last, so it reaches you cold.",
  "rice-grains": "Sealed pack. Check the best-before date printed on the pack.",
  snacks: "Sealed pack from the store’s shelf.",
  drinks: "Sealed bottle or carton, chilled where the store has it in the fridge.",
  household: "Sold in the manufacturer’s pack.",
  "personal-care": "Sold sealed in the manufacturer’s pack.",
};

/** Product detail: big picture, price, pack sizes, "Picked for you", quantity box + Add item. */
function ProductSheet({ open, onClose, storeId, variants, selectedId, onSelect }: {
  open: boolean; onClose: () => void; storeId: string; variants: CatalogueProduct[]; selectedId: string; onSelect: (id: string) => void;
}) {
  const c = cart.use();
  const p = variants.find((v) => v.productId === selectedId) ?? variants[0];
  const inCart = c.storeId === storeId ? c.items[p.productId]?.qty ?? 0 : 0;
  const [want, setWant] = useState(1);
  const [picks, setPicks] = useState<CatalogueProduct[]>([]);
  useEffect(() => { if (open) setWant(inCart || 1); }, [open, p.productId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    api<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products?category=${p.category}`)
      .then((r) => setPicks(r.products.filter((x) => x.groupKey !== p.groupKey && x.inStock).slice(0, 6)))
      .catch(() => setPicks([]));
  }, [open, storeId, p.category, p.groupKey]);
  const pct = offPct(p);
  return (
    <Sheet open={open} onClose={onClose} title="Product details">
      <div className="space-y-4">
        <div className={`relative grid aspect-[16/9] place-items-center overflow-hidden rounded-[22px] ${tintFor(p.productId)}`}>
          {pct >= 1 && p.inStock ? <span className="absolute left-0 top-0 rounded-br-[20px] rounded-tl-[20px] bg-offbg px-4 py-3 text-xl font-extrabold leading-[1.05] text-brand">{pct}%<br />Save</span> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-[70%] w-auto max-w-[60%] object-contain" />
        </div>
        <div>
          <h3 className="text-2xl font-bold leading-tight">{p.name} <span className="font-medium text-ink-2">{p.packLabel}</span></h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="text-3xl font-extrabold leading-none">{rupees(p.price)}</span>
            {p.mrp > p.price ? <span className="text-ink-2 line-through">MRP {rupees(p.mrp)}</span> : null}
            {p.popular ? <span className="rounded-full bg-offbg px-3 py-1 text-[13px] font-semibold text-brand">★ Popular here</span> : null}
          </p>
          <p className="mt-2 text-sm text-ink-2">{p.inStock ? `In stock (${p.stock})` : "Out of stock"} · {categoryName(p.category)}{p.brand ? ` · ${p.brand}` : ""}</p>
        </div>
        {variants.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pack size">
            {variants.map((v) => (
              <button key={v.productId} type="button" role="radio" aria-checked={v.productId === p.productId} onClick={() => onSelect(v.productId)}
                className={`min-h-11 rounded-xl border-2 px-3 text-sm font-semibold ${v.productId === p.productId ? "border-brand bg-mint" : "border-line"}`}>
                {v.packLabel} · {rupees(v.price)}
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-sm text-ink-2">{CATEGORY_NOTE[p.category] ?? ""}</p>
        {picks.length ? (
          <section>
            <h4 className="mb-3 text-xl font-bold">Picked for you</h4>
            <ProductRow products={picks} storeId={storeId} alwaysScroll />
          </section>
        ) : null}
        <div className="sticky bottom-0 -mx-5 -mb-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center gap-3 border-t border-line bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          {p.inStock ? (
            <>
              <div className="flex h-14 w-[40%] max-w-[150px] items-center rounded-2xl border-[1.5px] border-line" role="group" aria-label="Quantity to add">
                <button type="button" onClick={() => setWant(Math.max(1, want - 1))} disabled={want <= 1} className="grid h-14 w-11 place-items-center text-brand disabled:opacity-35" aria-label="One less"><IconMinus /></button>
                <output className="flex-1 text-center text-lg font-bold">{want}</output>
                <button type="button" onClick={() => setWant(Math.min(p.stock, want + 1))} disabled={want >= p.stock} className="grid h-14 w-11 place-items-center text-brand disabled:opacity-35" aria-label="One more"><IconPlus /></button>
              </div>
              <Button size="lg" className="flex-1 !rounded-2xl text-[17px]" onClick={() => { addToCart(storeId, p, want); onClose(); }}>
                {inCart ? "Update cart" : "Add item"} · {rupees(p.price * want)}
              </Button>
            </>
          ) : <Button size="lg" className="w-full" disabled>Out of stock</Button>}
        </div>
      </div>
    </Sheet>
  );
}

export function ProductGrid({ products, storeId }: { products: CatalogueProduct[]; storeId: string }) {
  const groups = groupVariants(products);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {groups.map((g) => <ProductCard key={g.map((x) => x.productId).join()} variants={g} storeId={storeId} />)}
    </div>
  );
}

export function ProductRow({ products, storeId, alwaysScroll }: { products: CatalogueProduct[]; storeId: string; alwaysScroll?: boolean }) {
  const groups = groupVariants(products);
  return (
    <div className={`no-scrollbar relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-0.5 ${alwaysScroll ? "" : "md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 xl:grid-cols-5"}`}>
      {groups.map((g) => (
        <div key={g.map((x) => x.productId).join()} className={`w-[168px] shrink-0 ${alwaysScroll ? "" : "md:w-auto"}`}>
          <ProductCard variants={g} storeId={storeId} />
        </div>
      ))}
    </div>
  );
}
