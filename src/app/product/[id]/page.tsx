"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/client/hooks";
import { cart, setup } from "@/lib/client/store";
import { rupees } from "@/lib/money";
import { CATEGORIES, type CatalogueProduct } from "@/lib/types";
import { ShopFrame } from "@/components/customer/Frame";
import { addToCart, offPct, ProductRow, tintFor } from "@/components/customer/ProductCard";
import { useNearbyStores } from "@/components/customer/useStores";
import { Button, ErrorBox, Skeleton } from "@/components/ui";
import { IconBag, IconChevron, IconClock, IconMinus, IconPlus, IconStore } from "@/components/icons";

type Detail = { product: CatalogueProduct; variants: CatalogueProduct[]; similar: CatalogueProduct[] };

const NOTE: Record<string, string> = {
  "fruits-vegetables": "Fresh produce is checked by the store when packing. If it doesn’t look right, staff follow your choice at checkout: contact you, or remove it.",
  "dairy-eggs": "Kept chilled at the store and packed last, so it reaches you cold.",
  "rice-grains": "Sealed pack. Check the best-before date printed on the pack.",
  snacks: "Sealed pack from the store’s shelf.",
  drinks: "Sealed bottle or carton, chilled where the store has it in the fridge.",
  household: "Sold in the manufacturer’s pack.",
  "personal-care": "Sold sealed in the manufacturer’s pack.",
};

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ShopFrame back="/" title="Product">{(storeId) => <ProductBody storeId={storeId} id={id} />}</ShopFrame>;
}

function ProductBody({ storeId, id }: { storeId: string; id: string }) {
  const { data, error, reload } = useApi<Detail>(`/stores/${storeId}/products?product=${encodeURIComponent(id)}`);
  const s = setup.use();
  const c = cart.use();
  const router = useRouter();
  const { stores } = useNearbyStores(s.address);
  const store = stores?.find((x) => x.id === storeId);
  const [want, setWant] = useState(1);
  const p = data?.product;
  const inCart = p && c.storeId === storeId ? c.items[p.productId]?.qty ?? 0 : 0;
  useEffect(() => { setWant(inCart || 1); }, [p?.productId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return error.status === 404 ? (
      <div className="mx-auto max-w-md rounded-3xl bg-tile p-8 text-center">
        <p className="text-lg font-semibold">Not sold at this store</p>
        <p className="mt-1 text-sm text-ink-2">{s.storeName ?? "Your store"} doesn’t sell this product. Try searching for something similar.</p>
        <Link href="/" className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-brand px-6 font-semibold text-white">Back to shop</Link>
      </div>
    ) : <ErrorBox message={error.message} onRetry={reload} />;
  }
  if (!data || !p) return <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="aspect-square" /><Skeleton className="h-80" /></div>;

  const pct = offPct(p);
  const cat = CATEGORIES.find((x) => x.slug === p.category);
  return (
    <div className="space-y-10">
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-2">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:text-brand">Home</Link></li>
          <li aria-hidden><IconChevron className="h-3.5 w-3.5" /></li>
          <li><Link href={`/category/${p.category}`} className="hover:text-brand">{cat?.name}</Link></li>
          <li aria-hidden><IconChevron className="h-3.5 w-3.5" /></li>
          <li className="font-semibold text-ink">{p.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div className={`relative grid aspect-square max-h-[520px] w-full place-items-center overflow-hidden rounded-[28px] ${tintFor(p.productId)}`}>
          {pct >= 1 && p.inStock ? <span className="absolute left-0 top-0 rounded-br-[24px] rounded-tl-[24px] bg-offbg px-5 py-3.5 text-2xl font-extrabold leading-[1.05] text-brand">{pct}%<br />OFF</span> : null}
          {p.popular ? <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand shadow-[var(--shadow-soft)]">★ Popular here</span> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={`${p.name}, ${p.packLabel}`} className={`h-[62%] w-[62%] object-contain drop-shadow-xl ${p.inStock ? "" : "opacity-60 grayscale"}`} />
        </div>

        <div className="space-y-5">
          <div>
            {p.brand ? <p className="text-sm font-semibold text-brand">{p.brand}</p> : null}
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight">{p.name}</h1>
            <p className="mt-1 text-ink-2">{p.packLabel}</p>
          </div>
          <div>
            <p className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-extrabold">{rupees(p.price)}</span>
              {p.mrp > p.price ? <span className="text-lg text-ink-2 line-through">MRP {rupees(p.mrp)}</span> : null}
              {pct >= 1 ? <span className="rounded-full bg-offbg px-3 py-1 text-sm font-bold text-brand">{pct}% off</span> : null}
            </p>
            <p className="mt-1 text-xs text-ink-2">Inclusive of all taxes</p>
          </div>

          {data.variants.length > 1 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold">Pack size</h2>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Pack size">
                {data.variants.map((v) => {
                  const on = v.productId === p.productId;
                  return (
                    <button key={v.productId} type="button" role="radio" aria-checked={on} onClick={() => router.replace(`/product/${v.productId}`)}
                      className={`min-h-14 min-w-28 rounded-2xl border-2 px-4 py-2 text-left ${on ? "border-brand bg-mint" : "border-line hover:border-brand"}`}>
                      <span className="block font-bold">{v.packLabel}</span>
                      <span className="block text-sm text-ink-2">{rupees(v.price)}{v.inStock ? "" : " · out of stock"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {p.inStock ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-14 items-center rounded-2xl border-[1.5px] border-line" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setWant(Math.max(1, want - 1))} disabled={want <= 1} className="grid h-14 w-12 place-items-center text-brand disabled:opacity-35" aria-label="One less"><IconMinus /></button>
                <output className="w-10 text-center text-lg font-bold">{want}</output>
                <button type="button" onClick={() => setWant(Math.min(p.stock, want + 1))} disabled={want >= p.stock} className="grid h-14 w-12 place-items-center text-brand disabled:opacity-35" aria-label="One more"><IconPlus /></button>
              </div>
              <Button size="lg" className="min-w-52 flex-1 !rounded-2xl text-[17px]" onClick={() => addToCart(storeId, p, want)}>
                <IconBag className="h-5 w-5" />{inCart ? (inCart === want ? "In cart" : "Update cart") : "Add to cart"} · {rupees(p.price * want)}
              </Button>
              {inCart ? <Link href="/cart" className="inline-flex min-h-14 items-center gap-1 rounded-2xl border-[1.5px] border-brand px-5 font-semibold text-brand hover:bg-mint">Go to cart <IconChevron className="h-4 w-4" /></Link> : null}
              {p.stock <= 5 ? <p className="w-full text-sm font-semibold text-warn">Only {p.stock} left at this store</p> : null}
            </div>
          ) : <Button size="lg" disabled className="w-full !rounded-2xl">Out of stock at this store</Button>}

          <div className="grid gap-3 rounded-[22px] bg-tile p-4 text-sm sm:grid-cols-2">
            <p className="flex items-start gap-2.5"><IconClock className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><span><b className="block">{store ? `Delivery in ${store.etaMin}–${store.etaMax} min` : "Delivery in minutes"}</b><span className="text-ink-2">{store?.deliveryFee ? `₹${store.deliveryFee / 100} fee, free above ${rupees(store.freeDeliveryAbove)}` : "Free delivery"}</span></span></p>
            <p className="flex items-start gap-2.5"><IconStore className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><span><b className="block">Sold by {store?.name ?? s.storeName}</b><span className="text-ink-2">{store ? `${store.distanceLabel} away · ` : ""}<Link href="/stores" className="font-semibold text-brand hover:underline">Change store</Link></span></span></p>
          </div>

          <section>
            <h2 className="mb-2 text-lg font-bold">Product details</h2>
            <dl className="divide-y divide-line overflow-hidden rounded-[18px] border border-line text-sm">
              {[["Brand", p.brand || "—"], ["Pack size", p.packLabel], ["Category", cat?.name ?? ""], ["Availability", p.inStock ? `In stock (${p.stock})` : "Out of stock"]].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-2.5"><dt className="text-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-ink-2">{NOTE[p.category] ?? ""}</p>
          </section>
        </div>
      </div>

      {data.similar.length ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[21px] font-bold tracking-tight">You may also like</h2>
            <Link href={`/category/${p.category}`} className="inline-flex min-h-10 items-center text-[15px] font-semibold text-brand">See all ›</Link>
          </div>
          <ProductRow products={data.similar} storeId={storeId} />
        </section>
      ) : null}
    </div>
  );
}
