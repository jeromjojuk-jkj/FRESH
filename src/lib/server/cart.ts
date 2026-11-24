import type { Q } from "./db";
import { ApiError } from "./http";
import { distanceMeters, isValidLatLng, isWithinServiceRadius, type LatLng } from "../geo";
import type { CartLine, Quote, QuoteLine } from "../types";
import { estimateWindow, getStore, HANDLING_FEE, isOpenNow, storeWorkload } from "./stores";
import { router } from "./providers/routing";

export function cleanLines(items: unknown): CartLine[] {
  if (!Array.isArray(items)) throw new ApiError(400, "BAD_CART", "Cart items are missing.");
  const map = new Map<string, number>();
  for (const it of items) {
    const pid = String((it as any)?.productId ?? "");
    const qty = Math.floor(Number((it as any)?.qty));
    if (!pid || !Number.isFinite(qty) || qty <= 0) continue;
    map.set(pid, Math.min(50, (map.get(pid) ?? 0) + qty));
  }
  return [...map].map(([productId, qty]) => ({ productId, qty }));
}

/** Prices a cart at one store. Used for the cart screen, checkout and the store-switch comparison. */
export async function quote(q: Q, storeId: string, items: CartLine[], point?: LatLng): Promise<Quote> {
  const store = await getStore(q, storeId);
  if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "This store is no longer available.");
  const ids = items.map((i) => i.productId);
  const { rows } = ids.length
    ? await q(
        `SELECT p.id, p.name, p.pack_label, p.image, sp.price, sp.stock, sp.active
         FROM products p LEFT JOIN store_products sp ON sp.product_id=p.id AND sp.store_id=$1
         WHERE p.id = ANY($2::text[])`,
        [storeId, ids],
      )
    : { rows: [] as any[] };
  const byId = new Map(rows.map((r) => [r.id, r]));
  const problems: string[] = [];
  const lines: QuoteLine[] = items.map((it) => {
    const r = byId.get(it.productId);
    if (!r || r.price == null || !r.active) {
      return { productId: it.productId, name: r?.name ?? "Item", packLabel: r?.pack_label ?? "", image: r?.image ?? "", qty: it.qty, price: 0, lineTotal: 0, available: false, stock: 0, issue: `Not sold at ${store.name}` };
    }
    let issue: string | undefined;
    if (r.stock <= 0) issue = "Out of stock";
    else if (r.stock < it.qty) issue = `Only ${r.stock} left`;
    return { productId: r.id, name: r.name, packLabel: r.pack_label, image: r.image, qty: it.qty, price: r.price, lineTotal: r.price * it.qty, available: !issue, stock: r.stock, issue };
  });
  for (const l of lines) if (l.issue) problems.push(`${l.name} (${l.packLabel}): ${l.issue}`);
  const ok = lines.filter((l) => l.available);
  const subtotal = ok.reduce((s, l) => s + l.lineTotal, 0);
  const deliveryFee = subtotal === 0 || subtotal >= store.free_delivery_above ? 0 : store.delivery_fee;
  const handlingFee = subtotal === 0 ? 0 : HANDLING_FEE;

  let etaMin = 0, etaMax = 0;
  if (point && isValidLatLng(point)) {
    const d = distanceMeters(point, store);
    if (!isWithinServiceRadius(d)) problems.unshift(`${store.name} does not deliver to this address (more than 3 km away).`);
    const travel = await router().travel(store, point);
    const w = estimateWindow({ prep: store.prep_minutes, workload: await storeWorkload(q, store.id), travelMin: travel.minutes });
    etaMin = w.min; etaMax = w.max;
  }
  if (!isOpenNow(store)) problems.unshift(`${store.name} is closed right now.`);
  else if (!store.accepting_orders) problems.unshift(`${store.name} has paused new orders.`);

  return {
    storeId, storeName: store.name, lines, subtotal, deliveryFee, freeDeliveryAbove: store.free_delivery_above, handlingFee,
    total: subtotal + deliveryFee + handlingFee, itemCount: ok.reduce((s, l) => s + l.qty, 0), problems, etaMin, etaMax,
  };
}
