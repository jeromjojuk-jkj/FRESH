import { beforeAll, describe, expect, it } from "vitest";
import { query, resetDatabase } from "@/lib/server/db";
import { quote } from "@/lib/server/cart";
import { catalogue, search } from "@/lib/server/catalogue";
import { placeOrder, storeAction, riderAction, getCustomerOrder } from "@/lib/server/orders";
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
