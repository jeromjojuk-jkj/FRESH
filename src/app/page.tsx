"use client";
import Link from "next/link";
import { setup } from "@/lib/client/store";
import { useApi, useHydrated } from "@/lib/client/hooks";
import type { CatalogueProduct } from "@/lib/types";
import { Welcome } from "@/components/customer/Welcome";
import { ShopFrame } from "@/components/customer/Frame";
import { SearchBox } from "@/components/customer/SearchBox";
import { ProductRow } from "@/components/customer/ProductCard";
import { useNearbyStores } from "@/components/customer/useStores";
import { CategoryTabs, CategoryTiles } from "@/components/customer/CategoryTiles";
import { IconChevron, IconList, IconStore } from "@/components/icons";
import { rupees } from "@/lib/money";
import { Logo } from "@/components/Logo";
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
  { title: "Atta, rice & dal", cats: ["rice-grains"], see: "rice-grains" },
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

  return (
    <div className="space-y-6">
      <header className="-mx-4 -mt-4 space-y-3 bg-gradient-to-b from-hero via-hero-2 to-white px-4 pt-3 lg:mx-0 lg:mt-0 lg:rounded-2xl lg:p-5">
        <div className="hidden items-center justify-between sm:flex"><Logo /><Link href="/demo" className="inline-flex min-h-10 items-center rounded-xl border border-dashed border-brand bg-white px-3 text-xs font-semibold uppercase tracking-wide text-brand">Demo switcher</Link></div>
        <div className="flex items-start gap-3">
          <Link href="/address" className="group min-w-0 flex-1" aria-label={`Delivery in ${store ? `${store.etaMin} to ${store.etaMax} minutes` : "a few minutes"} to ${a.flat ? a.flat + ", " : ""}${a.line}. Change address`}>
            <span className="block text-xs font-bold tracking-wide">KripFresh delivers in</span>
            <span className="block text-[26px] font-extrabold leading-tight tracking-tight">{store ? `${store.etaMin}–${store.etaMax} minutes` : "…"}</span>
            <span className="flex min-w-0 items-center gap-1 text-[13px]">
              <b className="shrink-0 uppercase">{a.label ?? "Home"}</b><span className="shrink-0">–</span>
              <span className="truncate">{[a.flat, a.floor && `${a.floor} floor`, a.line].filter(Boolean).join(", ")}</span>
              <IconChevron className="h-4 w-4 shrink-0 rotate-90" />
            </span>
          </Link>
          <Link href="/orders" className="grid h-[52px] w-[52px] shrink-0 place-items-center content-center rounded-full bg-white text-[10px] font-semibold text-ink shadow-[var(--shadow-soft)]">
            <IconList className="h-5 w-5" />Orders
          </Link>
        </div>
        <SearchBox storeId={storeId} />
        <CategoryTabs />
      </header>

      <div className="flex items-center gap-3 rounded-xl bg-mint px-3 py-2.5 text-[13px]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand"><IconStore className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><b>{store?.name ?? s.storeName}</b>{store ? ` · ${store.distanceLabel}` : ""}
          <span className="block text-xs text-ink-2">{store ? (store.deliveryFee ? `Delivery ${rupees(store.deliveryFee)} · free above ${rupees(store.freeDeliveryAbove)}` : "Free delivery") : ""}</span></span>
        <Link href="/stores" className="inline-flex min-h-11 shrink-0 items-center px-1 text-[13px] font-semibold text-brand">Change store</Link>
      </div>

      {again.data && again.data.products.length > 0 ? (
        <Aisle title="Buy again" products={again.data.products} storeId={storeId} />
      ) : null}

      <section aria-labelledby="cats" className="space-y-3">
        <h2 id="cats" className="text-lg font-bold tracking-tight">Shop by category</h2>
        <CategoryTiles />
      </section>

      {all.error ? <ErrorBox message={all.error.message} onRetry={all.reload} /> : !all.data ? (
        <div className="flex gap-2.5"><Skeleton className="h-64 w-[140px]" /><Skeleton className="h-64 w-[140px]" /></div>
      ) : AISLES.map((ai) => (
        <Aisle key={ai.title} title={ai.title} see={ai.see} storeId={storeId}
          products={products.filter((p) => ai.cats.includes(p.category) || ai.extra?.includes(p.productId)).sort((x, y) => Number(y.inStock) - Number(x.inStock)).slice(0, 12)} />
      ))}
    </div>
  );
}

function Aisle({ title, products, storeId, see }: { title: string; products: CatalogueProduct[]; storeId: string; see?: string }) {
  if (!products.length) return null;
  const id = "aisle-" + title.replace(/\W+/g, "-").toLowerCase();
  return (
    <section aria-labelledby={id} className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h2 id={id} className="text-lg font-bold tracking-tight">{title}</h2>
        {see ? <Link href={`/category/${see}`} className="inline-flex min-h-10 items-center text-[13px] font-semibold text-brand">see all</Link> : null}
      </div>
      <ProductRow products={products} storeId={storeId} />
    </section>
  );
}
