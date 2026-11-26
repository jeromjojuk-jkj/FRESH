import type { Q } from "./db";
import type { CouponView } from "../types";

/**
 * Fees and offers. Every charge is computed here and shown in the cart before payment:
 * nothing is added at checkout that the customer hasn't seen (no drip pricing), and
 * nothing optional (tip, coupon, membership) is pre-selected.
 */
export const HANDLING_FEE = 500;          // ₹5 per order: picking and packing
export const SMALL_CART_LIMIT = 9900;      // carts under ₹99…
export const SMALL_CART_FEE = 1500;        // …pay ₹15, unless the customer has Plus
export const PLUS_PRICE = 9900;            // ₹99 per month (simulated)
export const PLUS_FREE_DELIVERY_ABOVE = 9900;
export const MAX_TIP = 20000;              // ₹200

export type CouponRow = {
  code: string; title: string; description: string; kind: "pct" | "flat" | "freedelivery"; value: number;
  max_discount: number | null; min_order: number; category: string | null; first_order_only: boolean; plus_only: boolean; active: boolean;
};

export type CustomerContext = { isPlus: boolean; plusUntil: string | null; previousOrders: number };

export async function customerContext(q: Q, customerId?: string | null): Promise<CustomerContext> {
  if (!customerId) return { isPlus: false, plusUntil: null, previousOrders: 0 };
  const { rows } = await q(
    `SELECT c.plus_until,
       (SELECT count(*)::int FROM orders o WHERE o.customer_id=c.id AND o.status NOT IN ('declined','cancelled')) AS n
     FROM customers c WHERE c.id=$1`,
    [customerId],
  );
  const r = rows[0];
  const isPlus = !!r?.plus_until && new Date(r.plus_until).getTime() > Date.now();
  return { isPlus, plusUntil: r?.plus_until ?? null, previousOrders: r?.n ?? 0 };
}

export async function activeCoupons(q: Q): Promise<CouponRow[]> {
  const { rows } = await q<CouponRow>(`SELECT * FROM coupons WHERE active ORDER BY min_order, code`);
  return rows;
}

/** Works out one coupon against a cart. `deliveryFee` is the fee before any coupon. */
export function evaluateCoupon(c: CouponRow, cart: { subtotal: number; byCategory: Record<string, number>; deliveryFee: number }, ctx: CustomerContext): CouponView {
  const base = { code: c.code, title: c.title, description: c.description };
  const fail = (reason: string): CouponView => ({ ...base, eligible: false, reason, discount: 0, waivesDelivery: false });
  if (!c.active) return fail("This coupon has ended.");
  if (c.plus_only && !ctx.isPlus) return fail("For KripFresh Plus members.");
  if (c.first_order_only && ctx.previousOrders > 0) return fail("Only on your first order.");
  if (cart.subtotal < c.min_order) return fail(`Add items worth ₹${Math.ceil((c.min_order - cart.subtotal) / 100)} more to use this.`);
  const eligibleAmount = c.category ? cart.byCategory[c.category] ?? 0 : cart.subtotal;
  if (c.category && eligibleAmount === 0) return fail("Add fruits or vegetables to use this.");
  if (c.kind === "freedelivery") {
    if (cart.deliveryFee === 0) return fail("Your delivery is already free.");
    return { ...base, eligible: true, discount: cart.deliveryFee, waivesDelivery: true };
  }
  let discount = c.kind === "pct" ? Math.floor((eligibleAmount * c.value) / 100) : c.value;
  if (c.max_discount != null) discount = Math.min(discount, c.max_discount);
  discount = Math.min(discount, eligibleAmount);
  return { ...base, eligible: discount > 0, discount, waivesDelivery: false, reason: discount > 0 ? undefined : "Nothing to discount yet." };
}

/** All fees for a cart, given the customer's membership and chosen coupon. */
export function computeCharges(opts: {
  subtotal: number; storeDeliveryFee: number; storeFreeAbove: number; isPlus: boolean; coupon: CouponView | null; tip: number;
}) {
  const { subtotal, isPlus } = opts;
  if (subtotal === 0) return { deliveryFee: 0, handlingFee: 0, smallCartFee: 0, discount: 0, tip: 0, total: 0, deliveryBeforeCoupon: 0 };
  const freeAbove = isPlus ? Math.min(PLUS_FREE_DELIVERY_ABOVE, opts.storeFreeAbove) : opts.storeFreeAbove;
  const deliveryBeforeCoupon = subtotal >= freeAbove ? 0 : opts.storeDeliveryFee;
  const smallCartFee = !isPlus && subtotal < SMALL_CART_LIMIT ? SMALL_CART_FEE : 0;
  const c = opts.coupon?.eligible ? opts.coupon : null;
  const deliveryFee = c?.waivesDelivery ? 0 : deliveryBeforeCoupon;
  const discount = c && !c.waivesDelivery ? Math.min(c.discount, subtotal) : 0;
  const tip = Math.max(0, Math.min(MAX_TIP, Math.round(opts.tip || 0)));
  const total = subtotal - discount + deliveryFee + HANDLING_FEE + smallCartFee + tip;
  return { deliveryFee, handlingFee: HANDLING_FEE, smallCartFee, discount, tip, total, deliveryBeforeCoupon };
}
