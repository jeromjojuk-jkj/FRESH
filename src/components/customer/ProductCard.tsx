"use client";
import { useMemo, useState } from "react";
import type { CatalogueProduct } from "@/lib/types";
import { rupees } from "@/lib/money";
import { cart, setQty } from "@/lib/client/store";
import { Button, QtyStepper } from "../ui";
import { IconPlus } from "../icons";

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

export function ProductCard({ variants, storeId }: { variants: CatalogueProduct[]; storeId: string }) {
  const c = cart.use();
  const inCart = (id: string) => (c.storeId === storeId ? c.items[id]?.qty ?? 0 : 0);
  const initial = useMemo(
    () => variants.find((v) => inCart(v.productId) > 0) ?? variants.find((v) => v.inStock) ?? variants[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variants],
  );
  const [selId, setSelId] = useState(initial.productId);
  const p = variants.find((v) => v.productId === selId) ?? variants[0];
  const qty = inCart(p.productId);
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const label = `${p.name}, ${p.packLabel}`;

  return (
    <article className="relative flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-white p-3 transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(23,99,58,.35)]" aria-label={label}>
      <div className={`relative mb-2 grid aspect-square place-items-center rounded-2xl bg-mint ${p.inStock ? "" : "opacity-60 grayscale"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" width={256} height={256} loading="lazy" decoding="async" className="h-[70%] w-[70%] object-contain drop-shadow-sm" />
        {off >= 5 && p.inStock ? <span className="absolute left-2 top-2 rounded-lg bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white">{off}% off</span> : null}
        {!p.inStock ? <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/95 py-1 text-center text-xs font-semibold text-ink">Out of stock</span> : null}
      </div>

      {variants.length > 1 ? (
        <div className="mb-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Pack size for ${p.name}`}>
          {variants.map((v) => {
            const on = v.productId === p.productId;
            const n = inCart(v.productId);
            return (
              <button key={v.productId} type="button" role="radio" aria-checked={on} onClick={() => setSelId(v.productId)}
                className={`min-h-9 rounded-lg border-2 px-2.5 text-[13px] font-semibold ${on ? "border-brand bg-fresh/60 text-ink" : "border-line bg-white text-ink-2 hover:border-brand"}`}>
                {v.packLabel}{n ? ` · ${n} in cart` : ""}
              </button>
            );
          })}
        </div>
      ) : (
        <span className="mb-1.5 inline-flex w-fit rounded-lg bg-mint px-2 py-0.5 text-[13px] font-semibold text-ink">{p.packLabel}</span>
      )}

      <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-ink">{p.name}</h3>
      {p.brand ? <p className="truncate text-xs text-ink-2">{p.brand}</p> : null}

      <div className="mt-auto pt-2">
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-ink">{rupees(p.price)}</span>
          {p.mrp > p.price ? <span className="text-xs text-ink-2 line-through"><span className="sr-only">MRP </span>{rupees(p.mrp)}</span> : null}
          <span className="ml-auto truncate text-[11px] font-semibold text-ink-2">/ {p.packLabel}</span>
        </div>
        {!p.inStock ? (
          <Button variant="secondary" disabled className="h-11 min-h-11 w-full">Out of stock</Button>
        ) : qty > 0 ? (
          <QtyStepper qty={qty} max={p.stock} label={label} onChange={(n) => addToCart(storeId, p, n)} />
        ) : (
          <Button className="h-11 min-h-11 w-full" onClick={() => addToCart(storeId, p, 1)} aria-label={`Add ${label} to cart`}>
            <IconPlus className="h-5 w-5" /> Add
          </Button>
        )}
        {p.inStock && p.stock <= 5 ? <p className="mt-1 text-center text-[11px] font-semibold text-warn">Only {p.stock} left</p> : null}
      </div>
    </article>
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

export function ProductRow({ products, storeId }: { products: CatalogueProduct[]; storeId: string }) {
  const groups = groupVariants(products);
  return (
    <div className="no-scrollbar relative -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 xl:grid-cols-5">
      {groups.map((g) => (
        <div key={g.map((x) => x.productId).join()} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-auto">
          <ProductCard variants={g} storeId={storeId} />
        </div>
      ))}
    </div>
  );
}
