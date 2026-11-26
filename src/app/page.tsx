"use client";
import Link from "next/link";
import { setup } from "@/lib/client/store";
import { useApi, useHydrated } from "@/lib/client/hooks";
import type { CatalogueProduct } from "@/lib/types";
import { Welcome } from "@/components/customer/Welcome";
import { ShopFrame } from "@/components/customer/Frame";
import { SearchBox } from "@/components/customer/SearchBox";
import { offPct, ProductRow } from "@/components/customer/ProductCard";
import { Banners } from "@/components/customer/Banners";
import { useNearbyStores } from "@/components/customer/useStores";
import { CategoryTiles } from "@/components/customer/CategoryTiles";
import { IconList, IconScooter, IconStore } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { ErrorBox, Skeleton } from "@/components/ui";

export default function HomePage() {
  const s = setup.use();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="mx-auto max-w-xl space-y-3 p-5"><Skeleton className="h-10 w-40" /><Skeleton className="h-72" /></div>;
  if (!s.address) return <Welcome />;
  return <ShopFrame ownHeader>{(storeId) => <Storefront storeId={storeId} />}</ShopFrame>;
}

// Aisles shown on the home screen, in shopping order.
const AISLES: { title: string; cats: string[]; see: string; extra?: string[] }[] = [
  { title: "Fruits & vegetables", cats: ["fruits-vegetables"], see: "fruits-vegetables" },
  { title: "Dairy, bread & eggs", cats: ["dairy-eggs"], see: "dairy-eggs", extra: ["bread-400g"] },
  { title: "Rice, atta & dal", cats: ["rice-grains"], see: "rice-grains" },
  { title: "Snacks & drinks", cats: ["snacks", "drinks"], see: "snacks" },
  { title: "Home & personal care", cats: ["household", "personal-care"], see: "household" },
];

function Storefront({ storeId }: { storeId: string }) {
  const s = setup.use();
  const { stores } = useNearbyStores(s.address);
  const store = stores?.find((x) => x.id === storeId);
  const all = useApi<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products`);
  const again = useApi<{ products: CatalogueProduct[] }>(`/stores/${storeId}/products?section=buy-again`);
  const a = s.address!;
  const products = all.data?.products ?? [];
  const offers = products.filter((p) => p.inStock).sort((x, y) => offPct(y) - offPct(x)).slice(0, 10);
  const where = [a.flat, a.line].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <header className="-mx-4 -mt-4 space-y-4 bg-gradient-to-b from-head via-head-2 to-white px-4 pb-1 pt-3.5 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="KripFresh home" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white shadow-[var(--shadow-soft)]"><LogoMark /></Link>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[15px] font-bold text-white"><IconScooter className="h-[18px] w-[18px]" />Delivery</span>
            <Link href="/address" className="mt-0.5 block min-h-8 truncate py-1 text-[13px] text-ink-2" aria-label={`Delivery within 3 km${store ? `, ${store.etaMin} to ${store.etaMax} minutes` : ""}, to ${where}. Change address`}>
              Delivery <b className="font-semibold text-ink">within 3 km</b>{store ? <> · <b className="font-semibold text-ink">{store.etaMin}–{store.etaMax} min</b></> : null} · {where}
            </Link>
          </div>
          <Link href="/orders" className="grid h-[52px] w-[52px] shrink-0 place-items-center content-center rounded-full bg-white text-[9.5px] font-semibold text-ink shadow-[var(--shadow-soft)]">
            <IconList className="h-5 w-5 text-brand" />Orders
          </Link>
        </div>
        <SearchBox storeId={storeId} />
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <IconStore className="h-[18px] w-[18px] shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate">From <b className="text-ink">{store?.name ?? s.storeName}</b>{store ? ` · ${store.distanceLabel}` : ""}</span>
          <Link href="/stores" className="inline-flex min-h-10 shrink-0 items-center font-semibold text-brand">Change store</Link>
        </div>
      </header>

      <Banners storeName={store?.name ?? s.storeName ?? "your store"} eta={store ? `${store.etaMin}–${store.etaMax} min` : null} freeAbove={store?.freeDeliveryAbove} />

      <section aria-labelledby="cats" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="cats" className="text-[21px] font-bold tracking-tight">Shop by category</h2>
          <Link href="/category/fruits-vegetables" className="inline-flex min-h-10 items-center text-[15px] font-semibold text-brand">See all ›</Link>
        </div>
        <CategoryTiles />
      </section>

      {again.data && again.data.products.length > 0 ? <Aisle title="Buy again" products={again.data.products} storeId={storeId} /> : null}

      {all.error ? <ErrorBox message={all.error.message} onRetry={all.reload} /> : !all.data ? (
        <div className="flex gap-3"><Skeleton className="h-72 w-[168px]" /><Skeleton className="h-72 w-[168px]" /></div>
      ) : (
        <>
          <Aisle title={<>Offers for you <span aria-hidden>🔥</span></>} products={offers} storeId={storeId} />
          {AISLES.map((ai) => (
            <Aisle key={ai.title} title={ai.title} see={ai.see} storeId={storeId}
              products={products.filter((p) => ai.cats.includes(p.category) || ai.extra?.includes(p.productId)).sort((x, y) => Number(y.inStock) - Number(x.inStock)).slice(0, 12)} />
          ))}
        </>
      )}
    </div>
  );
}

function Aisle({ title, products, storeId, see }: { title: React.ReactNode; products: CatalogueProduct[]; storeId: string; see?: string }) {
  if (!products.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[21px] font-bold tracking-tight">{title}</h2>
        {see ? <Link href={`/category/${see}`} className="inline-flex min-h-10 items-center text-[15px] font-semibold text-brand">See all ›</Link> : null}
      </div>
      <ProductRow products={products} storeId={storeId} />
    </section>
  );
}
