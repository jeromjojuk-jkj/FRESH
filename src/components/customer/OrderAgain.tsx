"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { cart, setup } from "@/lib/client/store";
import { Button } from "../ui";

/** Puts this order's items back in the cart at today's prices, then opens the cart. */
export function OrderAgain({ o, className = "" }: { o: any; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const addr = setup.get().address;
      const want = o.items.filter((i: any) => i.qty > i.removedQty && !i.replacesItemId).map((i: any) => ({ productId: i.productId, qty: i.qty - i.removedQty }));
      const r = await api<{ quote: any }>("/cart/quote", { method: "POST", json: { storeId: o.store.id, items: want, location: addr } });
      const items: Record<string, any> = {};
      for (const l of r.quote.lines) if (l.price > 0 && l.stock > 0) items[l.productId] = { qty: Math.min(l.qty, l.stock), name: l.name, packLabel: l.packLabel, image: l.image, price: l.price };
      setup.set((v) => ({ ...v, storeId: o.store.id, storeName: o.store.name }));
      cart.set(() => ({ storeId: o.store.id, items, updatedAt: Date.now() }));
      router.push("/cart");
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <Button onClick={go} busy={busy}>Order again</Button>
      {err ? <span className="text-xs text-danger">{err}</span> : null}
    </span>
  );
}

