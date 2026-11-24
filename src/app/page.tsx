"use client";
import Link from "next/link";
import { setup } from "@/lib/client/store";
import { useApi, useHydrated } from "@/lib/client/hooks";
import { CATEGORIES, type CatalogueProduct } from "@/lib/types";
import { Welcome } from "@/components/customer/Welcome";
import { ShopFrame } from "@/components/customer/Frame";
import { SearchBox } from "@/components/customer/SearchBox";
import { StoreCard } from "@/components/customer/StoreCard";
import { ProductRow } from "@/components/customer/ProductCard";
import { useNearbyStores } from "@/components/customer/useStores";
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
  const { stores } = useNearbyStores(s.address);
  const store = stores?.find((x) => x.id === storeId);
  const featured = useApi<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products?section=featured`);
  const again = useApi<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products?section=buy-again`);

  return (
    <div className="space-y-6">
      <div className="sticky top-[65px] z-20 -mx-4 bg-white px-4 pb-2 pt-1 lg:static lg:mx-0 lg:px-0">
        <SearchBox storeId={storeId} />
      </div>
      <StoreCard store={store} name={s.storeName} />

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-3 text-lg font-semibold">Shop by category</h2>
        <ul className="grid grid-cols-4 gap-2.5 sm:grid-cols-7">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/category/${c.slug}`} className="group flex h-full flex-col items-center gap-1.5 rounded-2xl p-1 text-center hover:bg-mint">
                <span className="grid aspect-square w-full place-items-center rounded-2xl bg-mint transition-colors group-hover:bg-fresh/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt="" className="h-3/5 w-3/5 object-contain" />
                </span>
                <span className="text-xs font-medium leading-tight text-ink">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {again.data && again.data.products.length > 0 ? (
        <section aria-labelledby="again">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="again" className="text-lg font-semibold">Buy again</h2>
            <span className="text-xs text-ink-2">From your past orders at this store</span>
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
