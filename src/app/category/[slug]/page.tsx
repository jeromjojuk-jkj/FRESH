"use client";
import { use } from "react";
import { useApi } from "@/lib/client/hooks";
import { CATEGORIES, type CatalogueProduct } from "@/lib/types";
import { ShopFrame } from "@/components/customer/Frame";
import { CategoryTabs } from "@/components/customer/CategoryTiles";
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
      <CategoryTabs current={slug} />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      ) : data.products.length === 0 ? (
        <p className="rounded-2xl bg-mint p-6 text-center text-sm">This store has nothing in this category right now.</p>
      ) : <ProductGrid products={data.products} storeId={storeId} />}
    </div>
  );
}
