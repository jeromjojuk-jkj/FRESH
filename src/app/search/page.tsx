"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/lib/client/hooks";
import { CATEGORIES, type CatalogueProduct } from "@/lib/types";
import { ShopFrame } from "@/components/customer/Frame";
import { ProductGrid } from "@/components/customer/ProductCard";
import { SearchBox } from "@/components/customer/SearchBox";
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
      <SearchBox key={q} storeId={storeId} initial={q} autoFocus={!q} />
      {q ? <p className="text-sm text-ink-2">Results for <strong className="text-ink">“{q}”</strong> at {s.storeName}</p> : null}
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
      ) : <ProductGrid products={data.products} storeId={storeId} />}
    </div>
  );
}
