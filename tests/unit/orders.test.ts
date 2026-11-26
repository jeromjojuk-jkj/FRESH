import { beforeAll, describe, expect, it } from "vitest";
import { query, resetDatabase } from "@/lib/server/db";
import { quote } from "@/lib/server/cart";
import { catalogue, search } from "@/lib/server/catalogue";
import { placeOrder, storeAction, riderAction, getCustomerOrder, cancelByCustomer, reportIssue, rateOrder } from "@/lib/server/orders";
import { setPlus } from "@/lib/server/account";
import { SAMPLE_ADDRESSES } from "@/lib/demo-data";

const home = SAMPLE_ADDRESSES[0];
const address = { lat: home.lat, lng: home.lng, line: home.line, flat: "A-1" };

async function freshCustomer(id: string) {
  await query(`INSERT INTO customers (id,name) VALUES ($1,'Test') ON CONFLICT DO NOTHING`, [id]);
  return id;
}

async function order(customer: string, key: string, productId: string, qty = 1, store = "greenleaf") {
  const qt = await quote(query, store, [{ productId, qty }], home);
  return placeOrder(customer, {
    idempotencyKey: key, storeId: store, items: [{ productId, qty, price: qt.lines[0].price }],
    address, substitutionPref: "remove", paymentMethod: "cod", expectedTotal: qt.total,
  });
}

// Repeatable on any database: start from the demo seed. (Wipes DATABASE_URL data.)
beforeAll(async () => { await resetDatabase(); });

describe("per-store catalogues", () => {
  it("same product, different price and stock at two stores, no mixing", async () => {
    const g = (await catalogue(query, "greenleaf")).find((p) => p.productId === "milk-toned-1l")!;
    const a = (await catalogue(query, "annapurna")).find((p) => p.productId === "milk-toned-1l")!;
    await query(`UPDATE store_products SET price=5400, stock=3 WHERE store_id='greenleaf' AND product_id='milk-toned-1l'`);
    await query(`UPDATE store_products SET price=4900, stock=40 WHERE store_id='annapurna' AND product_id='milk-toned-1l'`);
    const g2 = (await catalogue(query, "greenleaf")).find((p) => p.productId === "milk-toned-1l")!;
    const a2 = (await catalogue(query, "annapurna")).find((p) => p.productId === "milk-toned-1l")!;
    expect(g && a).toBeTruthy();
    expect([g2.price, g2.stock]).toEqual([5400, 3]);
    expect([a2.price, a2.stock]).toEqual([4900, 40]);
    // Products a store doesn't carry never appear in its catalogue or search.
    expect((await catalogue(query, "annapurna")).some((p) => p.productId === "mango-1kg")).toBe(false);
    expect((await search(query, "annapurna", "mango")).some((p) => p.productId === "mango-1kg")).toBe(false);
    expect((await search(query, "greenleaf", "mango")).some((p) => p.productId === "mango-1kg")).toBe(true);
  });
});

describe("last unit", () => {
  it("two customers racing for the final unit: exactly one confirmed order", async () => {
    await query(`UPDATE store_products SET stock=1 WHERE store_id='greenleaf' AND product_id='paneer-200g'`);
    const [c1, c2] = [await freshCustomer("race-1"), await freshCustomer("race-2")];
    const results = await Promise.allSettled([order(c1, "race-key-0001", "paneer-200g"), order(c2, "race-key-0002", "paneer-200g")]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const bad = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok.length).toBe(1);
    expect(bad.length).toBe(1);
    expect(bad[0].reason.code).toMatch(/OUT_OF_STOCK|ITEMS_UNAVAILABLE/);
    const { rows } = await query(`SELECT stock FROM store_products WHERE store_id='greenleaf' AND product_id='paneer-200g'`);
    expect(rows[0].stock).toBe(0);
  });

  it("double tap / retry with the same key creates one order", async () => {
    const c = await freshCustomer("dup-1");
    const [a, b] = await Promise.all([order(c, "dup-key-000001", "onion-1kg"), order(c, "dup-key-000001", "onion-1kg")]);
    expect(a.code).toBe(b.code);
    const again = await order(c, "dup-key-000001", "onion-1kg");
    expect(again).toEqual({ code: a.code, duplicate: true });
    const { rows } = await query(`SELECT count(*)::int AS n FROM orders WHERE idempotency_key='dup-key-000001'`);
    expect(rows[0].n).toBe(1);
  });

  it("rejects an order whose total no longer matches (never silently charges more)", async () => {
    const c = await freshCustomer("price-1");
    const qt = await quote(query, "greenleaf", [{ productId: "carrot-500g", qty: 1 }], home);
    await query(`UPDATE store_products SET price=price+500 WHERE store_id='greenleaf' AND product_id='carrot-500g'`);
    await expect(placeOrder(c, { idempotencyKey: "price-key-0001", storeId: "greenleaf", items: [{ productId: "carrot-500g", qty: 1, price: qt.lines[0].price }], address, substitutionPref: "remove", paymentMethod: "cod", expectedTotal: qt.total }))
      .rejects.toMatchObject({ code: "PRICE_CHANGED" });
  });

  it("rejects an address outside 3 km at checkout", async () => {
    const c = await freshCustomer("far-1");
    const far = SAMPLE_ADDRESSES.find((a) => a.id === "whitefield")!;
    const qt = await quote(query, "greenleaf", [{ productId: "lemon-4", qty: 1 }], far);
    await expect(placeOrder(c, { idempotencyKey: "far-key-00001", storeId: "greenleaf", items: [{ productId: "lemon-4", qty: 1, price: qt.lines[0].price }], address: { lat: far.lat, lng: far.lng, line: far.line }, substitutionPref: "remove", paymentMethod: "cod", expectedTotal: qt.total }))
      .rejects.toMatchObject({ code: "OUT_OF_RANGE" });
  });
});

describe("order journey", () => {
  it("checkout → accept → pack (with a missing unit) → ready → pickup → delivered", async () => {
    const c = await freshCustomer("journey-1");
    await query(`UPDATE store_products SET stock=10 WHERE store_id='greenleaf' AND product_id='tomato-500g'`);
    const { code } = await order(c, "journey-key-01", "tomato-500g", 3);
    let o = await getCustomerOrder(c, code);
    expect(o.status).toBe("placed");
    const before = o.total;

    await storeAction("greenleaf", code, "accept");
    await storeAction("greenleaf", code, "start_packing");
    // Another store cannot touch this order.
    await expect(storeAction("annapurna", code, "ready")).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    const itemId = o.items[0].id;
    await storeAction("greenleaf", code, "pack_item", { itemId, packedQty: 2 });
    await expect(storeAction("greenleaf", code, "ready")).rejects.toMatchObject({ code: "NOT_ALL_PACKED" });
    await storeAction("greenleaf", code, "report_missing", { itemId }); // customer chose "remove"
    await storeAction("greenleaf", code, "ready");

    o = await getCustomerOrder(c, code);
    expect(o.status).toBe("ready");
    expect(o.total).toBeLessThan(before);
    expect(o.items[0]).toMatchObject({ qty: 3, packedQty: 2, removedQty: 1 });

    const { rows } = await query(`SELECT rider_id FROM orders WHERE code=$1`, [code]);
    const rider = rows[0].rider_id as string;
    expect(rider).toBeTruthy();
    await expect(riderAction("rider-not-mine", code, "pickup")).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    await riderAction(rider, code, "pickup");
    expect((await getCustomerOrder(c, code)).status).toBe("out_for_delivery");
    await riderAction(rider, code, "deliver");
    o = await getCustomerOrder(c, code);
    expect(o.status).toBe("delivered");
    expect(o.timeline.every((t: any) => t.done)).toBe(true);
  });
});

describe("search", () => {
  it("finds products by Tamil names within the selected store", async () => {
    expect((await search(query, "greenleaf", "அரிசி")).map((p) => p.productId)).toContain("rice-sona-5kg");
    expect((await search(query, "greenleaf", "தக்காளி")).some((p) => p.groupKey === "tomato")).toBe(true);
  });
});

describe("fees, coupons, membership and after-order features", () => {
  const place = async (c: string, key: string, items: { productId: string; qty: number }[], opts: { couponCode?: string; tip?: number } = {}) => {
    const qt = await quote(query, "greenleaf", items, home, { ...opts, customerId: c });
    return placeOrder(c, { idempotencyKey: key, storeId: "greenleaf", items: qt.lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price })), address, substitutionPref: "remove", paymentMethod: "cod", expectedTotal: qt.total, ...opts });
  };

  it("shows every fee up front: small cart fee under ₹99, handling, delivery, tip", async () => {
    const c = await freshCustomer("fees-1");
    const q = await quote(query, "greenleaf", [{ productId: "chilli-100g", qty: 1 }], home, { customerId: c, tip: 2000 });
    expect(q.smallCartFee).toBe(1500);
    expect(q.handlingFee).toBe(500);
    expect(q.deliveryFee).toBe(2500);
    expect(q.tip).toBe(2000);
    expect(q.total).toBe(q.subtotal + 1500 + 500 + 2500 + 2000);
  });

  it("checks coupon rules: first order, minimum value, category, invalid codes", async () => {
    const c = await freshCustomer("cp-1");
    const big = [{ productId: "rice-sona-5kg", qty: 1 }];
    const q1 = await quote(query, "greenleaf", big, home, { customerId: c, couponCode: "WELCOME50" });
    expect(q1.coupon?.eligible).toBe(true);
    expect(q1.discount).toBe(7500); // 50% capped at ₹75
    const small = await quote(query, "greenleaf", [{ productId: "lemon-4", qty: 1 }], home, { customerId: c, couponCode: "SAVE30" });
    expect(small.coupon?.eligible).toBe(false);
    expect(small.coupon?.reason).toMatch(/Add items worth/);
    const veg = await quote(query, "greenleaf", [{ productId: "rice-sona-5kg", qty: 1 }], home, { customerId: c, couponCode: "VEGGIE10" });
    expect(veg.coupon?.eligible).toBe(false);
    const bad = await quote(query, "greenleaf", big, home, { customerId: c, couponCode: "NOPE" });
    expect(bad.coupon?.eligible).toBe(false);
    // Placing with an ineligible coupon is refused, never silently dropped.
    await expect(place(c, "cp-key-0000001", [{ productId: "lemon-4", qty: 1 }], { couponCode: "SAVE30" })).rejects.toMatchObject({ code: "COUPON_INVALID" });
    const ok = await place(c, "cp-key-0000002", big, { couponCode: "WELCOME50", tip: 1000 });
    const o = await getCustomerOrder(c, ok.code);
    expect(o.discount).toBe(7500);
    expect(o.tip).toBe(1000);
    expect((await quote(query, "greenleaf", big, home, { customerId: c, couponCode: "WELCOME50" })).coupon?.reason).toMatch(/first order/);
  });

  it("Plus removes the small cart fee and gives free delivery above ₹99; cancel keeps benefits until the end", async () => {
    const c = await freshCustomer("plus-1");
    await setPlus(c, "join");
    const q = await quote(query, "greenleaf", [{ productId: "chilli-100g", qty: 1 }], home, { customerId: c });
    expect(q.isPlus).toBe(true);
    expect(q.smallCartFee).toBe(0);
    const q2 = await quote(query, "greenleaf", [{ productId: "honey-250g", qty: 1 }], home, { customerId: c });
    expect(q2.deliveryFee).toBe(0);
    const acc = await setPlus(c, "cancel");
    expect(acc.plus.active).toBe(true);
    expect(acc.plus.autoRenew).toBe(false);
  });

  it("customer can cancel before packing (stock returns) but not after", async () => {
    const c = await freshCustomer("cancel-1");
    const before = (await query(`SELECT stock FROM store_products WHERE store_id='greenleaf' AND product_id='onion-1kg'`)).rows[0].stock;
    const { code } = await place(c, "cancel-key-0001", [{ productId: "onion-1kg", qty: 2 }]);
    await cancelByCustomer(c, code, "Ordered by mistake");
    expect((await getCustomerOrder(c, code)).status).toBe("cancelled");
    expect((await query(`SELECT stock FROM store_products WHERE store_id='greenleaf' AND product_id='onion-1kg'`)).rows[0].stock).toBe(before);
    const second = await place(c, "cancel-key-0002", [{ productId: "onion-1kg", qty: 1 }]);
    await storeAction("greenleaf", second.code, "accept");
    await storeAction("greenleaf", second.code, "start_packing");
    await expect(cancelByCustomer(c, second.code, "Other")).rejects.toMatchObject({ code: "TOO_LATE_TO_CANCEL" });
  });

  it("reports a missing item after delivery: refund approved once, then rating", async () => {
    const c = await freshCustomer("issue-1");
    const { code } = await place(c, "issue-key-0001", [{ productId: "curd-400g", qty: 1 }, { productId: "bread-400g", qty: 1 }]);
    await expect(reportIssue(c, code, { kind: "missing", itemIds: [1] })).rejects.toMatchObject({ code: "NOT_DELIVERED" });
    await storeAction("greenleaf", code, "accept");
    await storeAction("greenleaf", code, "start_packing");
    let o = await getCustomerOrder(c, code);
    for (const i of o.items) await storeAction("greenleaf", code, "pack_item", { itemId: i.id, packedQty: i.qty });
    await storeAction("greenleaf", code, "ready");
    const rider = (await query(`SELECT rider_id FROM orders WHERE code=$1`, [code])).rows[0].rider_id;
    await riderAction(rider, code, "pickup");
    await riderAction(rider, code, "deliver");
    o = await getCustomerOrder(c, code);
    const curd = o.items.find((i: any) => i.productId === "curd-400g")!;
    const r = await reportIssue(c, code, { kind: "missing", itemIds: [curd.id] });
    expect(r.status).toBe("refund_approved");
    expect(r.refund).toBe(curd.price);
    await expect(reportIssue(c, code, { kind: "missing", itemIds: [curd.id] })).rejects.toMatchObject({ code: "ALREADY_REFUNDED" });
    await rateOrder(c, code, 5, "Quick!");
    expect((await getCustomerOrder(c, code)).rating).toBe(5);
  });
});
