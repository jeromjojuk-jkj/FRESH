"use client";
import Link from "next/link";
import { use } from "react";
import { useApi } from "@/lib/client/hooks";
import { CATEGORIES, type CatalogueProduct } from "@/lib/types";
import { ShopFrame } from "@/components/customer/Frame";
import { ProductGrid } from "@/components/customer/ProductCard";
import { ErrorBox, Skeleton } from "@/components/ui";

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const cat = CATEGORIES.find((c) => c.slug === slug);
  return (
    <ShopFrame back="/" title={cat?.name ?? "Category"}>
      {(storeId) => <CategoryBody storeId={storeId} slug={slug} />}
    </ShopFrame>
  );
}

function CategoryBody({ storeId, slug }: { storeId: string; slug: string }) {
  const { data, error, reload } = useApi<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products?category=${slug}`);
  return (
    <div className="space-y-4">
      <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`} aria-current={c.slug === slug ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm font-semibold ${c.slug === slug ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"}`}>
            {c.name}
          </Link>
        ))}
      </nav>
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      ) : data.products.length === 0 ? (
        <p className="rounded-2xl bg-mint p-6 text-center text-sm">This store has nothing in this category right now.</p>
      ) : <ProductGrid products={data.products} storeId={storeId} />}
    </div>
  );
}
