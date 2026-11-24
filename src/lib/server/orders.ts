import { randomBytes } from "node:crypto";
import { query, tx, type Q } from "./db";
import { ApiError } from "./http";
import { cleanLines, quote } from "./cart";
import { distanceMeters, isValidLatLng, isWithinServiceRadius } from "../geo";
import { estimateWindow, getStore, isOpenNow, storeWorkload, type StoreRow } from "./stores";
import { router } from "./providers/routing";
import { paymentProvider } from "./providers/payments";
import { notifyCustomer } from "./providers/notify";
import { rupees } from "../money";
import { ORDER_TIMELINE, STATUS_LABEL, type DeliveryAddress, type OrderStatus } from "../types";

const RIDER_SIGNAL_STALE_SEC = 45;

// ---------------------------------------------------------------- helpers

async function addEvent(q: Q, orderId: number, kind: "status" | "notice" | "eta", message: string) {
  await q(`INSERT INTO order_events (order_id, kind, message) VALUES ($1,$2,$3)`, [orderId, kind, message]);
}

async function customerPhone(q: Q, orderId: number): Promise<string | null> {
  const { rows } = await q(`SELECT c.phone FROM customers c JOIN orders o ON o.customer_id=c.id WHERE o.id=$1`, [orderId]);
  return rows[0]?.phone || null;
}

async function notice(q: Q, orderId: number, message: string) {
  await addEvent(q, orderId, "notice", message);
  await notifyCustomer(await customerPhone(q, orderId), message);
}

async function loadOrder(q: Q, where: string, params: unknown[], lock = false) {
  const { rows } = await q(`SELECT * FROM orders WHERE ${where} ${lock ? "FOR UPDATE" : ""}`, params);
  return rows[0] ?? null;
}

/** Recalculate totals after items change. Never adds a delivery fee that wasn't there. */
async function recomputeTotals(q: Q, order: any) {
  const { rows } = await q(`SELECT COALESCE(sum(price * (qty - removed_qty)),0)::int AS sub FROM order_items WHERE order_id=$1`, [order.id]);
  const subtotal = rows[0].sub as number;
  const deliveryFee = subtotal === 0 ? 0 : order.delivery_fee;
  const handlingFee = subtotal === 0 ? 0 : order.handling_fee;
  const total = subtotal + deliveryFee + handlingFee;
  await q(`UPDATE orders SET subtotal=$2, delivery_fee=$3, handling_fee=$4, total=$5, updated_at=now() WHERE id=$1`, [order.id, subtotal, deliveryFee, handlingFee, total]);
  const diff = total - order.total;
  if (diff < 0 && order.payment_status === "paid") await notice(q, order.id, `Your total dropped by ${rupees(-diff)}. A refund of ${rupees(-diff)} has been started (simulated payment).`);
  return { subtotal, total, diff };
}

const minutesSince = (t: string | Date | null) => (t ? (Date.now() - new Date(t).getTime()) / 60000 : 0);

/** Re-estimates the delivery window. Marks it revised (with a reason) when it moves later. */
async function refreshEta(q: Q, orderId: number, reasonIfLater?: string) {
  const o = await loadOrder(q, "id=$1", [orderId]);
  if (!o || !["placed", "accepted", "packing", "ready", "out_for_delivery"].includes(o.status)) return;
  const store = (await getStore(q, o.store_id))!;
  const workload = await storeWorkload(q, store.id);
  // A rider already assigned to this order is available to it.
  if (o.rider_id) workload.freeRiders = Math.max(1, workload.freeRiders);
  const to = { lat: o.lat, lng: o.lng };
  let travelMin = (await router().travel(store, to)).minutes;
  let stageElapsed = 0;
  const stageAt: Record<string, string | null> = { placed: o.created_at, accepted: o.accepted_at, packing: o.packing_at, ready: o.ready_at, out_for_delivery: o.picked_up_at };
  stageElapsed = minutesSince(stageAt[o.status]);
  if (o.status === "out_for_delivery" && o.rider_id) {
    const { rows } = await q(`SELECT lat,lng,updated_at FROM rider_locations WHERE rider_id=$1`, [o.rider_id]);
    const loc = rows[0];
    if (loc && minutesSince(loc.updated_at) * 60 < RIDER_SIGNAL_STALE_SEC && new Date(loc.updated_at) >= new Date(o.picked_up_at)) {
      travelMin = (await router().travel({ lat: loc.lat, lng: loc.lng }, to)).minutes;
      stageElapsed = 0;
    }
  }
  const w = estimateWindow({ prep: store.prep_minutes, workload, travelMin, stage: o.status, stageElapsedMin: stageElapsed });
  const now = Date.now();
  const newMin = new Date(now + w.min * 60000);
  const newMax = new Date(now + w.max * 60000);
  const oldMax = new Date(o.eta_max_at).getTime();
  const later = newMax.getTime() > oldMax + 2 * 60000;
  if (later) {
    const note = reasonIfLater ?? (workload.active > 3 ? "The store is busier than usual." : workload.freeRiders === 0 ? "Waiting for a delivery partner to become free." : "Your order is taking a little longer than expected.");
    await q(`UPDATE orders SET eta_min_at=$2, eta_max_at=$3, eta_revised=TRUE, eta_note=$4 WHERE id=$1`, [o.id, newMin, newMax, note]);
    await addEvent(q, o.id, "eta", `New estimate: arriving by ${fmtTime(newMax)}. ${note}`);
  } else {
    await q(`UPDATE orders SET eta_min_at=$2, eta_max_at=$3 WHERE id=$1`, [o.id, newMin, newMax]);
  }
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

async function setStatus(q: Q, order: any, status: OrderStatus, extra: Record<string, unknown> = {}) {
  const col: Partial<Record<OrderStatus, string>> = { accepted: "accepted_at", packing: "packing_at", ready: "ready_at", out_for_delivery: "picked_up_at", delivered: "delivered_at" };
  const c = col[status];
  const allowed = ["rider_id", "decline_reason", "payment_status"];
  const keys = Object.keys(extra).filter((k) => allowed.includes(k));
  const sets = keys.map((k, i) => `, ${k}=$${i + 3}`).join("");
  await q(`UPDATE orders SET status=$2, updated_at=now() ${c ? `, ${c}=now()` : ""} ${sets} WHERE id=$1`, [order.id, status, ...keys.map((k) => extra[k])]);
  await addEvent(q, order.id, "status", STATUS_LABEL[status]);
}

// ---------------------------------------------------------------- customer: place order

export type PlaceOrderInput = {
  idempotencyKey: string;
  storeId: string;
  items: { productId: string; qty: number; price?: number }[];
  address: DeliveryAddress;
  substitutionPref: "contact" | "remove";
  paymentMethod: "cod" | "upi_demo";
  paymentRef?: string;
  expectedTotal: number;
};

/**
 * Places an order. Everything is re-validated inside one transaction: store hours,
 * accepting flag, delivery capacity, 3 km radius, prices, stock. Stock is taken with a
 * conditional UPDATE (stock >= qty), so two shoppers can never both get the last unit.
 * The idempotency key makes double taps / retries return the same order.
 */
export async function placeOrder(customerId: string, input: PlaceOrderInput): Promise<{ code: string; duplicate: boolean }> {
  const key = String(input.idempotencyKey ?? "");
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw new ApiError(400, "BAD_IDEMPOTENCY_KEY", "Missing request key. Please refresh and try again.");
  const items = cleanLines(input.items);
  if (!items.length) throw new ApiError(400, "EMPTY_CART", "Your cart is empty.");
  const addr = input.address;
  if (!addr || !isValidLatLng(addr) || !String(addr.line ?? "").trim()) throw new ApiError(400, "BAD_ADDRESS", "Please confirm your delivery address.");
  if (!["contact", "remove"].includes(input.substitutionPref)) throw new ApiError(400, "BAD_PREF", "Choose what we should do if an item is unavailable.");
  const pay = paymentProvider(input.paymentMethod);

  const existing = await query(`SELECT code, customer_id FROM orders WHERE idempotency_key=$1`, [key]);
  if (existing.rows[0]) {
    if (existing.rows[0].customer_id !== customerId) throw new ApiError(409, "KEY_IN_USE", "Please refresh and try again.");
    return { code: existing.rows[0].code, duplicate: true };
  }

  try {
    return await tx(async (q) => {
      // Lock the store row: serialises capacity checks for this store.
      const { rows: sr } = await q<StoreRow>(`SELECT * FROM stores WHERE id=$1 FOR UPDATE`, [input.storeId]);
      const store = sr[0];
      if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "This store is no longer available.");
      if (!isOpenNow(store)) throw new ApiError(409, "STORE_CLOSED", `${store.name} has just closed. Please choose another store.`);
      if (!store.accepting_orders) throw new ApiError(409, "STORE_PAUSED", `${store.name} has paused new orders. Please choose another store.`);
      const dist = distanceMeters(addr, store);
      if (!isWithinServiceRadius(dist)) throw new ApiError(409, "OUT_OF_RANGE", `${store.name} does not deliver to this address. It is more than 3 km away.`);
      const workload = await storeWorkload(q, store.id);
      if (workload.active >= store.max_active_orders) throw new ApiError(409, "AT_CAPACITY", `${store.name} is very busy and cannot take new orders for a few minutes.`);

      const qt = await quote(q, store.id, items);
      const unavailable = qt.lines.filter((l) => !l.available);
      if (unavailable.length) throw new ApiError(409, "ITEMS_UNAVAILABLE", `Sorry, ${unavailable.map((l) => `${l.name} (${l.packLabel})`).join(", ")} ${unavailable.length > 1 ? "are" : "is"} no longer available in that quantity.`, { quote: qt });
      const clientPrice = new Map(input.items.map((i) => [i.productId, i.price]));
      const priceChanged = qt.lines.some((l) => clientPrice.get(l.productId) != null && clientPrice.get(l.productId) !== l.price);
      if (priceChanged || qt.total !== input.expectedTotal) throw new ApiError(409, "PRICE_CHANGED", "Prices changed since you opened your cart. Please review the new total.", { quote: qt });

      // Take stock. Fails atomically if another order took the last units first.
      for (const l of qt.lines) {
        const r = await q(`UPDATE store_products SET stock = stock - $3, updated_at=now() WHERE store_id=$1 AND product_id=$2 AND active AND stock >= $3`, [store.id, l.productId, l.qty]);
        if (r.rowCount !== 1) throw new ApiError(409, "OUT_OF_STOCK", `Sorry, ${l.name} (${l.packLabel}) just sold out.`, { productId: l.productId });
      }

      const payment = await pay.authorise(qt.total, input.paymentRef);
      const travel = await router().travel(store, addr);
      const w = estimateWindow({ prep: store.prep_minutes, workload, travelMin: travel.minutes });
      const { rows: idr } = await q(`SELECT nextval(pg_get_serial_sequence('orders','id'))::int AS id`);
      const id = idr[0].id as number;
      const code = `NB-${1000 + id}`;
      const cleanAddr: DeliveryAddress = {
        lat: addr.lat, lng: addr.lng, line: String(addr.line).slice(0, 200),
        flat: addr.flat?.slice(0, 60), floor: addr.floor?.slice(0, 30), landmark: addr.landmark?.slice(0, 100), instructions: addr.instructions?.slice(0, 200), label: addr.label?.slice(0, 30), phone: addr.phone?.replace(/[^\d+ ]/g, "").slice(0, 20),
      };
      await q(
        `INSERT INTO orders (id,code,idempotency_key,customer_id,store_id,status,address,lat,lng,distance_m,substitution_pref,payment_method,payment_status,payment_ref,subtotal,delivery_fee,handling_fee,total,eta_min_at,eta_max_at)
         VALUES ($1,$2,$3,$4,$5,'placed',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now() + ($18 || ' minutes')::interval, now() + ($19 || ' minutes')::interval)`,
        [id, code, key, customerId, store.id, JSON.stringify(cleanAddr), addr.lat, addr.lng, Math.round(dist), input.substitutionPref, pay.method, payment.status, payment.ref, qt.subtotal, qt.deliveryFee, qt.handlingFee, qt.total, String(w.min), String(w.max)],
      );
      for (const l of qt.lines) {
        await q(`INSERT INTO order_items (order_id,product_id,name,pack_label,image,price,qty) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, l.productId, l.name, l.packLabel, l.image, l.price, l.qty]);
      }
      await addEvent(q, id, "status", "Order placed");
      return { code, duplicate: false };
    });
  } catch (e: any) {
    // Two identical requests raced past the first check: return the winner.
    if (e?.code === "23505" || /idempotency_key/.test(String(e?.message))) {
      const again = await query(`SELECT code FROM orders WHERE idempotency_key=$1 AND customer_id=$2`, [key, customerId]);
      if (again.rows[0]) return { code: again.rows[0].code, duplicate: true };
    }
    throw e;
  }
}

// ---------------------------------------------------------------- views

export async function orderView(q: Q, o: any, audience: "customer" | "store" | "rider") {
  const [{ rows: items }, { rows: events }, { rows: st }] = await Promise.all([
    q(`SELECT id, product_id AS "productId", name, pack_label AS "packLabel", image, price, qty, packed_qty AS "packedQty", removed_qty AS "removedQty", status, replaces_item_id AS "replacesItemId" FROM order_items WHERE order_id=$1 ORDER BY id`, [o.id]),
    q(`SELECT kind, message, at FROM order_events WHERE order_id=$1 ORDER BY at, id`, [o.id]),
    q(`SELECT id, name, phone, address, lat, lng FROM stores WHERE id=$1`, [o.store_id]),
  ]);
  const stamps: Record<string, string | null> = { placed: o.created_at, accepted: o.accepted_at, packing: o.packing_at, ready: o.ready_at, out_for_delivery: o.picked_up_at, delivered: o.delivered_at };
  const idx = ORDER_TIMELINE.findIndex((t) => t.status === o.status);
  const timeline = ORDER_TIMELINE.map((t, i) => ({ ...t, at: stamps[t.status], done: idx >= 0 && i <= idx, current: i === idx }));

  let rider: any = null;
  if (o.rider_id) {
    const { rows } = await q(`SELECT r.id, r.name, r.phone, r.vehicle, l.lat, l.lng, l.updated_at FROM riders r LEFT JOIN rider_locations l ON l.rider_id=r.id WHERE r.id=$1`, [o.rider_id]);
    const r = rows[0];
    if (r) {
      // Customers only see their own rider, and only while the order is with the rider.
      const showLocation = audience !== "customer" || o.status === "out_for_delivery";
      const fresh = r.updated_at && (!o.picked_up_at || new Date(r.updated_at) >= new Date(o.picked_up_at));
      rider = {
        name: r.name, phone: r.phone, vehicle: r.vehicle,
        location: showLocation && r.lat != null && fresh
          ? { lat: r.lat, lng: r.lng, updatedAt: r.updated_at, ageSec: Math.round((Date.now() - new Date(r.updated_at).getTime()) / 1000), stale: (Date.now() - new Date(r.updated_at).getTime()) / 1000 > RIDER_SIGNAL_STALE_SEC }
          : null,
      };
    }
  }
  const lastEvent = events[events.length - 1];
  let customer: { name: string; phone: string } | null = null;
  if (audience !== "customer") {
    const { rows } = await q(`SELECT name, phone FROM customers WHERE id=$1`, [o.customer_id]);
    customer = rows[0] ? { name: rows[0].name, phone: rows[0].phone || o.address?.phone || "" } : null;
  }
  return {
    customer,
    code: o.code,
    status: o.status as OrderStatus,
    statusLabel: STATUS_LABEL[o.status as OrderStatus],
    createdAt: o.created_at,
    lastUpdateAt: lastEvent?.at ?? o.updated_at,
    store: st[0],
    address: o.address,
    distanceM: o.distance_m,
    items,
    itemCount: items.reduce((s: number, i: any) => s + i.qty - i.removedQty, 0),
    subtotal: o.subtotal, deliveryFee: o.delivery_fee, handlingFee: o.handling_fee, total: o.total,
    paymentMethod: o.payment_method, paymentStatus: o.payment_status, substitutionPref: o.substitution_pref,
    etaMinAt: o.eta_min_at, etaMaxAt: o.eta_max_at, etaRevised: o.eta_revised, etaNote: o.eta_note,
    declineReason: o.decline_reason,
    expectedPickupAt: o.ready_at ?? new Date(new Date(o.accepted_at ?? o.created_at).getTime() + 10 * 60000).toISOString(),
    events, timeline, rider,
    needsCustomer: items.some((i: any) => i.status === "short"),
  };
}

export async function getCustomerOrder(customerId: string, code: string) {
  const o0 = await query(`SELECT id, status, eta_max_at FROM orders WHERE code=$1 AND customer_id=$2`, [code, customerId]);
  if (!o0.rows[0]) throw new ApiError(404, "ORDER_NOT_FOUND", "We couldn't find this order.");
  const r = o0.rows[0];
  // Running late? Revise the estimate rather than showing a time that has passed.
  if (["placed", "accepted", "packing", "ready", "out_for_delivery"].includes(r.status) && new Date(r.eta_max_at).getTime() < Date.now() + 60000) {
    await tx((q) => refreshEta(q, r.id));
  }
  const o = await query(`SELECT * FROM orders WHERE id=$1`, [r.id]);
  return orderView(query, o.rows[0], "customer");
}

export async function listCustomerOrders(customerId: string) {
  const { rows } = await query(
    `SELECT o.code, o.status, o.total, o.created_at AS "createdAt", s.name AS "storeName",
       (SELECT sum(qty - removed_qty)::int FROM order_items WHERE order_id=o.id) AS "itemCount"
     FROM orders o JOIN stores s ON s.id=o.store_id WHERE o.customer_id=$1 ORDER BY o.created_at DESC LIMIT 30`,
    [customerId],
  );
  return rows.map((r) => ({ ...r, statusLabel: STATUS_LABEL[r.status as OrderStatus] }));
}

/** Customer resolves an item the store couldn't fully supply. */
export async function resolveShortItem(customerId: string, code: string, itemId: number, action: "remove" | "replace", replacementId?: string, acceptedPrice?: number) {
  return tx(async (q) => {
    const o = await loadOrder(q, "code=$1 AND customer_id=$2", [code, customerId], true);
    if (!o) throw new ApiError(404, "ORDER_NOT_FOUND", "We couldn't find this order.");
    const { rows } = await q(`SELECT * FROM order_items WHERE id=$1 AND order_id=$2 FOR UPDATE`, [itemId, o.id]);
    const it = rows[0];
    if (!it || it.status !== "short") throw new ApiError(409, "ALREADY_RESOLVED", "This item has already been sorted out.");
    const short = it.qty - it.packed_qty;
    if (action === "remove") {
      await q(`UPDATE order_items SET removed_qty=$2, status=$3 WHERE id=$1`, [it.id, short, it.packed_qty > 0 ? "packed" : "removed"]);
      await addEvent(q, o.id, "notice", `You removed ${short} × ${it.name} (${it.pack_label}).`);
    } else {
      if (!replacementId) throw new ApiError(400, "PICK_REPLACEMENT", "Choose a replacement.");
      const { rows: pr } = await q(`SELECT p.name, p.pack_label, p.image, sp.price FROM store_products sp JOIN products p ON p.id=sp.product_id WHERE sp.store_id=$1 AND sp.product_id=$2 AND sp.active`, [o.store_id, replacementId]);
      const rp = pr[0];
      if (!rp) throw new ApiError(404, "NOT_AVAILABLE", "That replacement is not available.");
      if (acceptedPrice !== rp.price) throw new ApiError(409, "PRICE_CHANGED", `The price of ${rp.name} is now ${rupees(rp.price)}. Please confirm again.`);
      const took = await q(`UPDATE store_products SET stock=stock-$3 WHERE store_id=$1 AND product_id=$2 AND stock >= $3`, [o.store_id, replacementId, short]);
      if (took.rowCount !== 1) throw new ApiError(409, "OUT_OF_STOCK", `${rp.name} just ran out. Please choose something else or remove the item.`);
      await q(`UPDATE order_items SET removed_qty=$2, status=$3 WHERE id=$1`, [it.id, short, it.packed_qty > 0 ? "packed" : "replaced"]);
      await q(`INSERT INTO order_items (order_id,product_id,name,pack_label,image,price,qty,replaces_item_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [o.id, replacementId, rp.name, rp.pack_label, rp.image, rp.price, short, it.id]);
      await addEvent(q, o.id, "notice", `You approved ${short} × ${rp.name} (${rp.pack_label}) at ${rupees(rp.price)} each instead of ${it.name} (${it.pack_label}).`);
    }
    await recomputeTotals(q, o);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- store (supplier)

export async function listStoreOrders(storeId: string, view: "new" | "active" | "done") {
  const statuses = view === "new" ? ["placed"] : view === "active" ? ["accepted", "packing", "ready", "out_for_delivery"] : ["delivered", "declined", "cancelled"];
  const { rows } = await query(
    `SELECT o.code, o.status, o.total, o.created_at AS "createdAt", o.accepted_at AS "acceptedAt", o.ready_at AS "readyAt",
       o.substitution_pref AS "substitutionPref", o.payment_method AS "paymentMethod",
       (SELECT sum(qty - removed_qty)::int FROM order_items WHERE order_id=o.id) AS "itemCount",
       (SELECT count(*)::int FROM order_items WHERE order_id=o.id AND status='short') AS "waitingOnCustomer",
       r.name AS "riderName", s.prep_minutes AS "prepMinutes"
     FROM orders o JOIN stores s ON s.id=o.store_id LEFT JOIN riders r ON r.id=o.rider_id
     WHERE o.store_id=$1 AND o.status = ANY($2::text[]) ORDER BY o.created_at ${view === "done" ? "DESC LIMIT 30" : "ASC"}`,
    [storeId, statuses],
  );
  return rows.map((r) => ({
    ...r,
    statusLabel: STATUS_LABEL[r.status as OrderStatus],
    expectedPickupAt: new Date(new Date(r.acceptedAt ?? r.createdAt).getTime() + (r.prepMinutes + 2) * 60000).toISOString(),
  }));
}

async function storeOrder(q: Q, storeId: string, code: string) {
  // Scoped by store: a supermarket can never load another store's order.
  const o = await loadOrder(q, "code=$1 AND store_id=$2", [code, storeId], true);
  if (!o) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found for this store.");
  return o;
}

export async function getStoreOrder(storeId: string, code: string) {
  const o = await loadOrder(query, "code=$1 AND store_id=$2", [code, storeId]);
  if (!o) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found for this store.");
  return orderView(query, o, "store");
}

export async function storeAction(storeId: string, code: string, action: string, payload: any = {}) {
  return tx(async (q) => {
    const o = await storeOrder(q, storeId, code);
    const need = (allowed: string[], msg: string) => { if (!allowed.includes(o.status)) throw new ApiError(409, "WRONG_STATE", msg); };
    switch (action) {
      case "accept": {
        need(["placed"], o.status === "accepted" || o.status === "packing" ? "Already accepted." : "This order can no longer be accepted.");
        const { rows: rr } = await q(
          `SELECT r.id FROM riders r ORDER BY (r.home_store_id = $1) DESC,
             (SELECT count(*) FROM orders x WHERE x.rider_id=r.id AND x.status IN ('accepted','packing','ready','out_for_delivery')) ASC, r.id LIMIT 1`,
          [storeId],
        );
        await setStatus(q, o, "accepted", rr[0] ? { rider_id: rr[0].id } : {});
        await notice(q, o.id, "The store accepted your order.");
        await refreshEta(q, o.id);
        break;
      }
      case "decline": {
        need(["placed"], "Only new orders can be declined.");
        const reason = String(payload.reason ?? "").trim();
        if (!reason) throw new ApiError(400, "REASON_REQUIRED", "Please choose a reason for declining.");
        const { rows: its } = await q(`SELECT product_id, qty FROM order_items WHERE order_id=$1`, [o.id]);
        for (const it of its) await q(`UPDATE store_products SET stock=stock+$3 WHERE store_id=$1 AND product_id=$2`, [storeId, it.product_id, it.qty]);
        await setStatus(q, o, "declined", { decline_reason: reason.slice(0, 200) });
        await notice(q, o.id, `${o.payment_status === "paid" ? "A full refund has been started (simulated payment). " : "You have not been charged. "}The store couldn't take your order: ${reason}`);
        break;
      }
      case "start_packing":
        need(["accepted"], o.status === "packing" ? "Already packing." : "Accept the order first.");
        await setStatus(q, o, "packing");
        await refreshEta(q, o.id);
        break;
      case "pack_item": {
        need(["packing"], "Start packing first.");
        const { rows } = await q(`SELECT * FROM order_items WHERE id=$1 AND order_id=$2 FOR UPDATE`, [payload.itemId, o.id]);
        const it = rows[0];
        if (!it) throw new ApiError(404, "ITEM_NOT_FOUND", "Item not found.");
        if (["short", "removed", "replaced"].includes(it.status)) throw new ApiError(409, "ITEM_LOCKED", "This item is waiting on the customer or already resolved.");
        const packed = Math.max(0, Math.min(it.qty, Math.floor(Number(payload.packedQty))));
        await q(`UPDATE order_items SET packed_qty=$2, status=$3 WHERE id=$1`, [it.id, packed, packed === it.qty ? "packed" : "pending"]);
        break;
      }
      case "report_missing": {
        need(["packing"], "Start packing first.");
        const { rows } = await q(`SELECT * FROM order_items WHERE id=$1 AND order_id=$2 FOR UPDATE`, [payload.itemId, o.id]);
        const it = rows[0];
        if (!it) throw new ApiError(404, "ITEM_NOT_FOUND", "Item not found.");
        if (it.status !== "pending") throw new ApiError(409, "ITEM_LOCKED", "This item is already resolved.");
        const short = it.qty - it.packed_qty;
        if (short <= 0) throw new ApiError(409, "NOTHING_MISSING", "All units are packed.");
        // Shelf is empty: correct the stock so no one else orders it.
        await q(`UPDATE store_products SET stock=0 WHERE store_id=$1 AND product_id=$2`, [storeId, it.product_id]);
        const label = `${it.name} (${it.pack_label})`;
        if (o.substitution_pref === "remove") {
          await q(`UPDATE order_items SET removed_qty=$2, status=$3 WHERE id=$1`, [it.id, short, it.packed_qty > 0 ? "packed" : "removed"]);
          await notice(q, o.id, `${short} × ${label} was unavailable and has been removed, as you asked. Your total has been reduced.`);
          await recomputeTotals(q, o);
        } else {
          await q(`UPDATE order_items SET status='short' WHERE id=$1`, [it.id]);
          await notice(q, o.id, `Action needed: ${short} × ${label} is unavailable. Choose a replacement or remove it.`);
        }
        break;
      }
      case "remove_short": {
        // Customer couldn't be reached: staff removes the item. Never substitutes on their own.
        const { rows } = await q(`SELECT * FROM order_items WHERE id=$1 AND order_id=$2 FOR UPDATE`, [payload.itemId, o.id]);
        const it = rows[0];
        if (!it || it.status !== "short") throw new ApiError(409, "ITEM_LOCKED", "This item is already resolved.");
        const short = it.qty - it.packed_qty;
        await q(`UPDATE order_items SET removed_qty=$2, status=$3 WHERE id=$1`, [it.id, short, it.packed_qty > 0 ? "packed" : "removed"]);
        await notice(q, o.id, `We couldn't reach you, so ${short} × ${it.name} (${it.pack_label}) was removed. You won't be charged for it.`);
        await recomputeTotals(q, o);
        break;
      }
      case "ready": {
        need(["packing"], o.status === "ready" ? "Already marked ready." : "Pack the order first.");
        const { rows } = await q(`SELECT count(*)::int AS n FROM order_items WHERE order_id=$1 AND status IN ('pending','short')`, [o.id]);
        if (rows[0].n > 0) throw new ApiError(409, "NOT_ALL_PACKED", "Pack every item, or report it missing, before marking ready.");
        const { rows: left } = await q(`SELECT count(*)::int AS n FROM order_items WHERE order_id=$1 AND qty > removed_qty`, [o.id]);
        if (left[0].n === 0) throw new ApiError(409, "EMPTY_ORDER", "No items left in this order. Contact the customer or decline it.");
        await setStatus(q, o, "ready");
        await refreshEta(q, o.id);
        break;
      }
      default:
        throw new ApiError(400, "UNKNOWN_ACTION", "Unknown action.");
    }
    const fresh = await loadOrder(q, "id=$1", [o.id]);
    return orderView(q, fresh, "store");
  });
}

// ---------------------------------------------------------------- rider

export async function listRiderDeliveries(riderId: string) {
  const { rows } = await query(
    `SELECT o.code, o.status, o.address, o.lat, o.lng, o.total, o.payment_method AS "paymentMethod", o.payment_status AS "paymentStatus",
       s.name AS "storeName", s.address AS "storeAddress", s.lat AS "storeLat", s.lng AS "storeLng", s.phone AS "storePhone",
       c.name AS "customerName", c.phone AS "customerPhone",
       (SELECT sum(qty - removed_qty)::int FROM order_items WHERE order_id=o.id) AS "itemCount"
     FROM orders o JOIN stores s ON s.id=o.store_id JOIN customers c ON c.id=o.customer_id
     WHERE o.rider_id=$1 AND (o.status IN ('accepted','packing','ready','out_for_delivery') OR (o.status='delivered' AND o.delivered_at > now() - interval '12 hours'))
     ORDER BY (o.status='delivered'), o.created_at`,
    [riderId],
  );
  const { rows: rr } = await query(`SELECT r.name, r.vehicle, r.sharing, l.updated_at AS "locationAt" FROM riders r LEFT JOIN rider_locations l ON l.rider_id=r.id WHERE r.id=$1`, [riderId]);
  return { rider: rr[0], deliveries: rows.map((r) => ({ ...r, statusLabel: STATUS_LABEL[r.status as OrderStatus] })) };
}

export async function riderAction(riderId: string, code: string, action: "pickup" | "deliver") {
  return tx(async (q) => {
    const o = await loadOrder(q, "code=$1 AND rider_id=$2", [code, riderId], true);
    if (!o) throw new ApiError(404, "ORDER_NOT_FOUND", "This delivery isn't assigned to you.");
    if (action === "pickup") {
      if (o.status === "out_for_delivery") return { ok: true };
      if (o.status !== "ready") throw new ApiError(409, "NOT_READY", "The store hasn't marked this order ready yet.");
      await setStatus(q, o, "out_for_delivery");
      await notice(q, o.id, "Your order is on the way.");
      await refreshEta(q, o.id);
    } else {
      if (o.status === "delivered") return { ok: true };
      if (o.status !== "out_for_delivery") throw new ApiError(409, "NOT_PICKED_UP", "Confirm pickup first.");
      await setStatus(q, o, "delivered", o.payment_method === "cod" ? { payment_status: "paid" } : {});
      await notice(q, o.id, "Delivered. Thank you for shopping local!");
      const { rows } = await q(`SELECT count(*)::int AS n FROM orders WHERE rider_id=$1 AND status='out_for_delivery'`, [riderId]);
      if (rows[0].n === 0) {
        // Delivery finished: stop sharing and forget the rider's position.
        await q(`UPDATE riders SET sharing=FALSE WHERE id=$1`, [riderId]);
        await q(`DELETE FROM rider_locations WHERE rider_id=$1`, [riderId]);
      }
    }
    return { ok: true };
  });
}

export async function updateRiderLocation(riderId: string, lat: number, lng: number, accuracy?: number) {
  if (!isValidLatLng({ lat, lng })) throw new ApiError(400, "BAD_LOCATION", "Invalid location.");
  const { rows } = await query(`SELECT count(*)::int AS n FROM orders WHERE rider_id=$1 AND status IN ('ready','out_for_delivery')`, [riderId]);
  if (rows[0].n === 0) {
    await query(`UPDATE riders SET sharing=FALSE WHERE id=$1`, [riderId]);
    throw new ApiError(409, "NO_ACTIVE_DELIVERY", "Location sharing has stopped: you have no active delivery.");
  }
  await query(
    `INSERT INTO rider_locations (rider_id,lat,lng,accuracy_m,updated_at) VALUES ($1,$2,$3,$4,now())
     ON CONFLICT (rider_id) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng, accuracy_m=EXCLUDED.accuracy_m, updated_at=now()`,
    [riderId, lat, lng, accuracy ?? null],
  );
  await query(`UPDATE riders SET sharing=TRUE WHERE id=$1`, [riderId]);
  return { ok: true };
}

export async function setRiderSharing(riderId: string, on: boolean) {
  // Pausing keeps the last known point so the customer still sees where the rider was.
  await query(`UPDATE riders SET sharing=$2 WHERE id=$1`, [riderId, on]);
  return { ok: true };
}

export function newIdempotencyKey() {
  return randomBytes(12).toString("hex");
}
