"use client";
import Link from "next/link";
import { favs, setup } from "@/lib/client/store";
import { useApi, useHydrated } from "@/lib/client/hooks";
import type { CatalogueProduct } from "@/lib/types";
import { Welcome } from "@/components/customer/Welcome";
import { ShopFrame } from "@/components/customer/Frame";
import { SearchBox } from "@/components/customer/SearchBox";
import { StoreCard } from "@/components/customer/StoreCard";
import { ProductRow } from "@/components/customer/ProductCard";
import { useNearbyStores } from "@/components/customer/useStores";
import { CategoryTiles } from "@/components/customer/CategoryTiles";
import { ErrorBox, Skeleton } from "@/components/ui";

export default function HomePage() {
  const s = setup.use();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="mx-auto max-w-xl space-y-3 p-5"><Skeleton className="h-10 w-40" /><Skeleton className="h-72" /></div>;
  if (!s.address) return <Welcome />;
  return <ShopFrame>{(storeId) => <Storefront storeId={storeId} />}</ShopFrame>;
}

function Storefront({ storeId }: { storeId: string }) {
  const s = setup.use();
  const f = favs.use();
  const { stores } = useNearbyStores(s.address);
  const store = stores?.find((x) => x.id === storeId);
  const featured = useApi<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products?section=featured`);
  const again = useApi<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products?section=buy-again`);
  const all = useApi<{ products: CatalogueProduct[] }>(Object.keys(f.ids).length ? `/stores/${storeId}/products` : null);
  const favourites = (all.data?.products ?? []).filter((p) => f.ids[p.productId]);

  return (
    <div className="space-y-6">
      <div className="-mx-4 -mt-4 rounded-b-[28px] bg-gradient-to-b from-hero via-hero-2 to-white px-4 pb-5 pt-2 lg:mx-0 lg:mt-0 lg:rounded-[28px] lg:p-5">
        <SearchBox storeId={storeId} />
      </div>

      <section aria-label={`This week at ${store?.name ?? "your store"}`} className="relative overflow-hidden rounded-[26px] bg-[radial-gradient(120%_140%_at_100%_0%,#2DBE5A_0%,transparent_55%),linear-gradient(135deg,#27A84F,#0E5F2A)] p-5 text-white">
        <span className="absolute right-4 top-3 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-brand-dark">Below MRP</span>
        <h2 className="max-w-[60%] text-[22px] font-bold uppercase leading-[1.1] tracking-tight">Fresh &amp; healthy vegetables</h2>
        <p className="mt-1.5 max-w-[58%] text-xs text-white/90">Picked this morning for {store?.name ?? "your store"}. Prices as marked on each product.</p>
        <Link href="/category/fruits-vegetables" className="mt-3 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-brand-dark">Shop vegetables</Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/p/basket.webp" alt="" className="pointer-events-none absolute -bottom-2 -right-1 w-[44%] max-w-[190px] drop-shadow-[0_10px_18px_rgba(0,0,0,.25)]" />
      </section>

      <StoreCard store={store} name={s.storeName} />

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-3 text-lg font-semibold">Most popular categories</h2>
        <CategoryTiles />
      </section>

      {favourites.length > 0 ? (
        <section aria-labelledby="favs">
          <h2 id="favs" className="mb-3 text-lg font-semibold">Your favourites</h2>
          <ProductRow products={favourites} storeId={storeId} />
        </section>
      ) : null}

      {again.data && again.data.products.length > 0 ? (
        <section aria-labelledby="again">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="again" className="text-lg font-semibold">Buy again</h2>
            <span className="text-xs text-ink-2">From your past orders here</span>
          </div>
          <ProductRow products={again.data.products} storeId={storeId} />
        </section>
      ) : null}

      <section aria-labelledby="fresh">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="fresh" className="text-lg font-semibold">Fresh from this store</h2>
          <Link href="/category/fruits-vegetables" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">See all</Link>
        </div>
        {featured.error ? <ErrorBox message={featured.error.message} onRetry={featured.reload} /> : !featured.data ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
        ) : <ProductRow products={featured.data.products} storeId={storeId} />}
      </section>
    </div>
  );
}
