import type { Q } from "./db";
import { ApiError } from "./http";
import { distanceMeters, isValidLatLng, isWithinServiceRadius, type LatLng } from "../geo";
import type { CartLine, CouponView, Quote, QuoteLine } from "../types";
import { activeCoupons, computeCharges, customerContext, evaluateCoupon, PLUS_FREE_DELIVERY_ABOVE, PLUS_PRICE, SMALL_CART_LIMIT } from "./pricing";
import { estimateWindow, getStore, isOpenNow, storeWorkload } from "./stores";
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
export type QuoteOptions = { couponCode?: string | null; tip?: number; customerId?: string | null };

export async function quote(q: Q, storeId: string, items: CartLine[], point?: LatLng, opts: QuoteOptions = {}): Promise<Quote> {
  const store = await getStore(q, storeId);
  if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "This store is no longer available.");
  const ids = items.map((i) => i.productId);
  const { rows } = ids.length
    ? await q(
        `SELECT p.id, p.name, p.pack_label, p.image, p.category, sp.price, sp.mrp, sp.stock, sp.active
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
  const mrpTotal = ok.reduce((s, l) => s + (byId.get(l.productId)?.mrp ?? l.price) * l.qty, 0);
  const byCategory: Record<string, number> = {};
  for (const l of ok) { const cat = byId.get(l.productId)?.category; if (cat) byCategory[cat] = (byCategory[cat] ?? 0) + l.lineTotal; }

  // Offers and fees, all shown before payment.
  const ctx = await customerContext(q, opts.customerId);
  const base = computeCharges({ subtotal, storeDeliveryFee: store.delivery_fee, storeFreeAbove: store.free_delivery_above, isPlus: ctx.isPlus, coupon: null, tip: 0 });
  const coupons = (await activeCoupons(q)).map((c) => evaluateCoupon(c, { subtotal, byCategory, deliveryFee: base.deliveryBeforeCoupon }, ctx));
  const code = (opts.couponCode ?? "").trim().toUpperCase();
  let coupon: CouponView | null = null;
  if (code) coupon = coupons.find((c) => c.code === code) ?? { code, title: code, description: "", eligible: false, reason: "This code isn’t valid.", discount: 0, waivesDelivery: false };
  const ch = computeCharges({ subtotal, storeDeliveryFee: store.delivery_fee, storeFreeAbove: store.free_delivery_above, isPlus: ctx.isPlus, coupon, tip: opts.tip ?? 0 });

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
    storeId, storeName: store.name, lines, subtotal, mrpTotal,
    deliveryFee: ch.deliveryFee, deliveryBeforeCoupon: ch.deliveryBeforeCoupon,
    freeDeliveryAbove: ctx.isPlus ? Math.min(PLUS_FREE_DELIVERY_ABOVE, store.free_delivery_above) : store.free_delivery_above,
    handlingFee: ch.handlingFee, smallCartFee: ch.smallCartFee, smallCartLimit: SMALL_CART_LIMIT,
    discount: ch.discount, coupon, coupons, tip: ch.tip, isPlus: ctx.isPlus, plusPrice: PLUS_PRICE,
    total: ch.total, savings: Math.max(0, mrpTotal - subtotal) + ch.discount + (ch.deliveryBeforeCoupon - ch.deliveryFee),
    itemCount: ok.reduce((s, l) => s + l.qty, 0), problems, etaMin, etaMax,
  };
}
