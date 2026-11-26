"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, type CatalogueProduct } from "@/lib/types";
import { Button, Sheet } from "../ui";
import { IconChevron } from "../icons";
import { offPct, ProductGrid } from "./ProductCard";

type Sort = "relevance" | "price-asc" | "price-desc" | "discount" | "name";
const SORTS: [Sort, string][] = [["relevance", "Relevance"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["discount", "Biggest discount"], ["name", "Name: A to Z"]];
const PRICES: [string, number, number][] = [["Under ₹50", 0, 5000], ["₹50 – ₹100", 5000, 10000], ["₹100 – ₹200", 10000, 20000], ["Over ₹200", 20000, Infinity]];

type Filters = { prices: number[]; brands: string[]; inStock: boolean; minOff: number };
const EMPTY: Filters = { prices: [], brands: [], inStock: false, minOff: 0 };

/** E-commerce listing: breadcrumb, title, filters (sidebar on desktop, sheet on phones), sort and grid. */
export function ProductListing({ products, storeId, title, current, crumb }: { products: CatalogueProduct[]; storeId: string; title: string; current?: string; crumb: string }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<Sort>("relevance");
  const [sheet, setSheet] = useState(false);
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(), [products]);

  const shown = useMemo(() => {
    const list = products.filter((p) =>
      (!f.prices.length || f.prices.some((i) => p.price >= PRICES[i][1] && p.price < PRICES[i][2])) &&
      (!f.brands.length || f.brands.includes(p.brand)) &&
      (!f.inStock || p.inStock) &&
      offPct(p) >= f.minOff);
    const by: Record<Sort, (a: CatalogueProduct, b: CatalogueProduct) => number> = {
      relevance: (a, b) => Number(b.inStock) - Number(a.inStock) || Number(!!b.popular) - Number(!!a.popular),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      discount: (a, b) => offPct(b) - offPct(a),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [products, f, sort]);
  const active = f.prices.length + f.brands.length + Number(f.inStock) + Number(f.minOff > 0);

  const panel = (
    <div className="space-y-6 text-sm">
      <FilterGroup title="Category">
        <ul className="grid gap-1">
          {CATEGORIES.map((c) => (
            <li key={c.slug}><Link href={`/category/${c.slug}`} aria-current={c.slug === current ? "page" : undefined}
              className={`flex min-h-9 items-center gap-2 rounded-lg px-2 ${c.slug === current ? "bg-mint font-semibold text-brand" : "hover:bg-tile"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" className="h-5 w-5 object-contain" />{c.name}</Link></li>
          ))}
        </ul>
      </FilterGroup>
      <FilterGroup title="Price">
        {PRICES.map(([label], i) => (
          <Check key={label} label={label} on={f.prices.includes(i)} onChange={(on) => setF({ ...f, prices: on ? [...f.prices, i] : f.prices.filter((x) => x !== i) })} />
        ))}
      </FilterGroup>
      {brands.length > 1 ? (
        <FilterGroup title="Brand">
          {brands.map((b) => <Check key={b} label={b} on={f.brands.includes(b)} onChange={(on) => setF({ ...f, brands: on ? [...f.brands, b] : f.brands.filter((x) => x !== b) })} />)}
        </FilterGroup>
      ) : null}
      <FilterGroup title="Discount">
        {[10, 20].map((n) => <Check key={n} label={`${n}% off or more`} on={f.minOff === n} onChange={(on) => setF({ ...f, minOff: on ? n : 0 })} />)}
      </FilterGroup>
      <FilterGroup title="Availability">
        <Check label="In stock only" on={f.inStock} onChange={(on) => setF({ ...f, inStock: on })} />
      </FilterGroup>
      {active ? <button type="button" onClick={() => setF(EMPTY)} className="min-h-10 font-semibold text-brand hover:underline">Clear all filters</button> : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="hidden text-[13px] text-ink-2 lg:block">
        <ol className="flex items-center gap-1"><li><Link href="/" className="hover:text-brand">Home</Link></li><li aria-hidden><IconChevron className="h-3.5 w-3.5" /></li><li className="font-semibold text-ink">{crumb}</li></ol>
      </nav>
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block" aria-label="Filters">{panel}</aside>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-xl font-bold tracking-tight lg:text-2xl">{title} <span className="text-base font-medium text-ink-2">({shown.length})</span></h1>
            <button type="button" onClick={() => setSheet(true)} className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-line px-4 text-sm font-semibold lg:hidden">Filters{active ? ` (${active})` : ""}</button>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="hidden text-ink-2 sm:inline">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort products" className="min-h-11 rounded-full border-[1.5px] border-line bg-white px-3 text-sm font-semibold focus:border-brand focus:outline-none">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          {shown.length ? <ProductGrid products={shown} storeId={storeId} /> : (
            <div className="rounded-3xl bg-tile p-8 text-center text-sm">
              <p className="font-semibold">No products match these filters.</p>
              {active ? <button type="button" onClick={() => setF(EMPTY)} className="mt-2 min-h-10 font-semibold text-brand hover:underline">Clear all filters</button> : null}
            </div>
          )}
        </div>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<Button onClick={() => setSheet(false)}>Show {shown.length} product{shown.length === 1 ? "" : "s"}</Button>}>
        {panel}
      </Sheet>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-ink-2">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 hover:bg-tile">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-[18px] w-[18px] accent-[#1C9A41]" />
      {label}
    </label>
  );
}
