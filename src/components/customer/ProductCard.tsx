"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogueProduct } from "@/lib/types";
import { rupees } from "@/lib/money";
import { api } from "@/lib/client/api";
import { cart, setQty } from "@/lib/client/store";
import { Button, Sheet } from "../ui";
import { IconClock, IconMinus, IconPlus } from "../icons";

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

const savePct = (p: CatalogueProduct) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);

function SaveTag({ p, className = "" }: { p: CatalogueProduct; className?: string }) {
  const pct = savePct(p);
  if (pct < 3 || !p.inStock) return null;
  return (
    <span className={`save-tag absolute left-2 top-0 z-[1] bg-deal px-1.5 pb-2.5 pt-1.5 text-center text-[11px] font-bold leading-none text-white ${className}`}>
      {pct}%<span className="block text-[10px] font-semibold">OFF</span>
    </span>
  );
}

/** Pill-shaped stepper that sits where the round + button was. */
export function MiniStepper({ qty, max, label, onChange }: { qty: number; max?: number; label: string; onChange: (n: number) => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center rounded-full bg-brand text-white" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" onClick={() => onChange(qty - 1)} className="grid h-11 w-10 place-items-center rounded-l-full hover:bg-brand-dark" aria-label={qty === 1 ? `Remove ${label}` : `Decrease ${label}`}><IconMinus className="h-4 w-4" /></button>
      <output className="min-w-5 text-center text-sm font-bold" aria-live="polite">{qty}</output>
      <button type="button" onClick={() => onChange(qty + 1)} disabled={max !== undefined && qty >= max} className="grid h-11 w-10 place-items-center rounded-r-full hover:bg-brand-dark disabled:opacity-40" aria-label={`Increase ${label}`}><IconPlus className="h-4 w-4" /></button>
    </div>
  );
}

/** Estimated minutes for the selected store, shown on each card ("22 MINS"). */
export const EtaContext = createContext<number | null>(null);

export function ProductCard({ variants, storeId }: { variants: CatalogueProduct[]; storeId: string }) {
  const c = cart.use();
  const eta = useContext(EtaContext);
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
  const pct = savePct(p);

  return (
    <article className="relative flex h-full flex-col rounded-xl border border-line bg-white p-2" aria-label={label}>
      {pct >= 3 && p.inStock ? (
        <span className="save-tag absolute left-1.5 top-0 z-[1] bg-deal px-1 pb-2 pt-1 text-center text-[10px] font-bold leading-none text-white">
          {pct}%<span className="block text-[9px]">OFF</span>
        </span>
      ) : null}
      <button type="button" onClick={() => setDetail(true)} aria-label={`Details for ${label}`}
        className={`relative grid aspect-square w-full place-items-center rounded-lg bg-tile ${p.inStock ? "" : "opacity-60 grayscale"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" width={256} height={256} loading="lazy" decoding="async" className="h-[70%] w-[70%] object-contain" />
        {!p.inStock ? <span className="absolute inset-x-2 bottom-2 rounded-md bg-white/95 py-0.5 text-center text-[11px] font-semibold text-ink">Out of stock</span> : null}
      </button>
      {eta ? (
        <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md bg-tile px-1.5 py-0.5 text-[9.5px] font-bold text-ink"><IconClock className="h-3 w-3" />{eta} MINS</span>
      ) : null}
      <h3 className="mt-1 line-clamp-2 min-h-[2.6em] text-[12.5px] font-semibold leading-[1.3] text-ink">{p.name}</h3>
      {variants.length > 1 ? (
        <div className="mt-1 flex flex-wrap gap-1" role="radiogroup" aria-label={`Pack size for ${p.name}`}>
          {variants.map((v) => {
            const on = v.productId === p.productId;
            const n = inCart(v.productId);
            return (
              <button key={v.productId} type="button" role="radio" aria-checked={on} onClick={() => setSelId(v.productId)}
                className={`min-h-8 rounded-lg border-[1.5px] px-1.5 text-[11px] font-semibold ${on ? "border-brand bg-mint text-ink" : "border-line bg-white text-ink-2 hover:border-brand"}`}>
                {v.packLabel}{n ? ` · ${n}` : ""}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-0.5 text-[11.5px] text-ink-2">{p.packLabel}</p>
      )}
      <div className="mt-auto flex items-end justify-between gap-1.5 pt-2">
        <span className="min-w-0 leading-tight">
          <span className="block text-[13.5px] font-bold text-ink">{rupees(p.price)}</span>
          {p.mrp > p.price ? <span className="text-[11px] text-ink-2 line-through"><span className="sr-only">MRP </span>{rupees(p.mrp)}</span> : null}
        </span>
        {!p.inStock ? (
          <span className="pb-1 text-[11px] font-semibold text-ink-2">Sold out</span>
        ) : qty > 0 ? (
          <div className="flex h-9 min-w-[72px] items-center rounded-lg bg-brand text-white" role="group" aria-label={`Quantity of ${label}`}>
            <button type="button" onClick={() => addToCart(storeId, p, qty - 1)} className="relative grid h-9 w-6 place-items-center after:absolute after:-inset-x-0.5 after:-inset-y-1" aria-label={qty === 1 ? `Remove ${label}` : `Decrease ${label}`}><IconMinus className="h-3.5 w-3.5" /></button>
            <output className="flex-1 text-center text-[13px] font-bold" aria-live="polite">{qty}</output>
            <button type="button" onClick={() => addToCart(storeId, p, qty + 1)} disabled={qty >= p.stock} className="relative grid h-9 w-6 place-items-center after:absolute after:-inset-x-0.5 after:-inset-y-1 disabled:opacity-40" aria-label={`Increase ${label}`}><IconPlus className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => addToCart(storeId, p, 1)} aria-label={`Add ${label} to cart`}
            className="relative h-9 min-w-16 rounded-lg border-[1.5px] border-brand bg-mint px-2 text-[13px] font-bold tracking-wide text-brand after:absolute after:-inset-y-1 after:inset-x-0 hover:bg-fresh">
            ADD
          </button>
        )}
      </div>
      {p.inStock && p.stock <= 5 ? <p className="mt-1 text-[10.5px] font-semibold text-warn">Only {p.stock} left</p> : null}

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

/** Product detail: big image, pack sizes, details, picks from the same store, quantity + add. */
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
      .then((r) => setPicks(r.products.filter((x) => x.groupKey !== p.groupKey && x.inStock).slice(0, 2)))
      .catch(() => setPicks([]));
  }, [open, storeId, p.category, p.groupKey]);
  const pct = savePct(p);
  return (
    <Sheet open={open} onClose={onClose} title="Product details">
      <div className="space-y-4">
        <div className="relative grid aspect-[16/10] place-items-center rounded-3xl bg-tile">
          <SaveTag p={p} className="left-3" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-[76%] w-auto max-w-[62%] object-contain drop-shadow" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{p.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold">{rupees(p.price)}</span>
            {p.mrp > p.price ? <span className="text-sm text-ink-2 line-through">{rupees(p.mrp)}</span> : null}
            {pct >= 3 ? <span className="rounded-full bg-fresh px-2 py-0.5 text-xs font-semibold text-brand-dark">{pct}% off MRP</span> : null}
            <span className="rounded-full bg-tile px-2 py-0.5 text-sm font-semibold">{p.packLabel}</span>
          </p>
        </div>
        {variants.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pack size">
            {variants.map((v) => (
              <button key={v.productId} type="button" role="radio" aria-checked={v.productId === p.productId} onClick={() => onSelect(v.productId)}
                className={`min-h-11 rounded-xl border-2 px-3 text-sm font-semibold ${v.productId === p.productId ? "border-brand bg-fresh" : "border-line"}`}>
                {v.packLabel} · {rupees(v.price)}
              </button>
            ))}
          </div>
        ) : null}
        <div>
          <h4 className="mb-1 text-sm font-semibold">More details</h4>
          <p className="text-sm text-ink-2">{p.brand ? `${p.brand} · ` : ""}{p.packLabel}. {p.inStock ? `${p.stock} in stock at this store.` : "Out of stock at this store right now."} {CATEGORY_NOTE[p.category] ?? ""}</p>
        </div>
        {picks.length ? (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Picks for you</h4>
            <ul className="grid grid-cols-2 gap-2">
              {picks.map((x) => (
                <li key={x.productId} className="flex items-center gap-2 rounded-2xl border border-line p-2 shadow-[var(--shadow-soft)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.image} alt="" className="h-10 w-10 shrink-0 object-contain" />
                  <span className="min-w-0 flex-1 text-xs"><b className="block truncate">{x.name}</b>{x.packLabel} · {rupees(x.price)}</span>
                  <button type="button" onClick={() => addToCart(storeId, x, (c.storeId === storeId ? c.items[x.productId]?.qty ?? 0 : 0) + 1)} aria-label={`Add ${x.name}, ${x.packLabel} to cart`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white"><IconPlus className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="sticky bottom-0 -mx-1 flex items-center gap-3 bg-white px-1 pt-2">
          {p.inStock ? (
            <>
              <MiniStepper qty={want} max={p.stock} label={`${p.name} to add`} onChange={(n) => setWant(Math.max(1, n))} />
              <Button size="lg" className="flex-1 rounded-full" onClick={() => { addToCart(storeId, p, want); onClose(); }}>
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
    <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {groups.map((g) => <ProductCard key={g.map((x) => x.productId).join()} variants={g} storeId={storeId} />)}
    </div>
  );
}

export function ProductRow({ products, storeId }: { products: CatalogueProduct[]; storeId: string }) {
  const groups = groupVariants(products);
  return (
    <div className="no-scrollbar relative -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 xl:grid-cols-5">
      {groups.map((g) => (
        <div key={g.map((x) => x.productId).join()} className="w-[140px] shrink-0 md:w-auto">
          <ProductCard variants={g} storeId={storeId} />
        </div>
      ))}
    </div>
  );
}
