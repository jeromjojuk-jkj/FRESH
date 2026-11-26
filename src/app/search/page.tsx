"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/client/hooks";
import { CATEGORIES, type CatalogueProduct } from "@/lib/types";
import { ShopFrame } from "@/components/customer/Frame";
import { ProductListing } from "@/components/customer/ProductListing";
import { clearRecentSearches, recentSearches, SearchBox } from "@/components/customer/SearchBox";
import { ErrorBox, Skeleton } from "@/components/ui";
import { setup } from "@/lib/client/store";

export default function SearchPage() {
  return <Suspense><SearchInner /></Suspense>;
}

function SearchInner() {
  const q = useSearchParams().get("q") ?? "";
  return <ShopFrame back="/" title="Search">{(storeId) => <Results storeId={storeId} q={q} />}</ShopFrame>;
}

function Results({ storeId, q }: { storeId: string; q: string }) {
  const s = setup.use();
  const { data, error, reload } = useApi<{ products: CatalogueProduct[] }>(q ? `/stores/${storeId}/products?q=${encodeURIComponent(q)}` : null);
  return (
    <div className="space-y-4">
      <div className="lg:hidden"><SearchBox key={q} storeId={storeId} initial={q} autoFocus={!q} /></div>
      {!q ? <SearchStart storeName={s.storeName ?? "your store"} /> : null}
      {!q ? null : error ? <ErrorBox message={error.message} onRetry={reload} /> : !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      ) : data.products.length === 0 ? (
        <div className="rounded-2xl bg-mint p-6 text-center">
          <p className="font-semibold">No matches at this store</p>
          <p className="mt-1 text-sm text-ink-2">Try a simpler word like “milk”, “dal” or “soap”, or browse a category.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {CATEGORIES.slice(0, 4).map((c) => <Link key={c.slug} href={`/category/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border-2 border-brand bg-white px-4 text-sm font-semibold text-brand">{c.name}</Link>)}
          </div>
        </div>
      ) : <ProductListing products={data.products} storeId={storeId} title={`Results for “${q}”`} crumb={`Search: ${q}`} />}
    </div>
  );
}

const TRENDING = ["Milk", "Tomato", "Onion", "Eggs", "Bread", "Curd", "அரிசி", "Banana", "Atta", "Chips"];

/** Before typing: recent searches (this device) and trending searches. */
function SearchStart({ storeName }: { storeName: string }) {
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(recentSearches()), []);
  const chip = (t: string) => (
    <button key={t} type="button" onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-4 text-sm font-medium hover:border-brand">{t}</button>
  );
  return (
    <div className="space-y-6">
      {recent.length ? (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between"><h2 className="text-base font-bold">Recent searches</h2><button type="button" onClick={() => { clearRecentSearches(); setRecent([]); }} className="min-h-10 text-sm font-semibold text-brand">Clear</button></div>
          <div className="flex flex-wrap gap-2">{recent.map(chip)}</div>
        </section>
      ) : null}
      <section className="space-y-2">
        <h2 className="text-base font-bold">Trending at {storeName}</h2>
        <div className="flex flex-wrap gap-2">{TRENDING.map(chip)}</div>
      </section>
    </div>
  );
}
