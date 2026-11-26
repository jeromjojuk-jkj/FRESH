import type { Q } from "./db";
import { distanceMeters, formatKm, isWithinServiceRadius, type LatLng } from "../geo";
import { router } from "./providers/routing";
import type { StoreSummary } from "../types";

export const ACTIVE_STATUSES = ["placed", "accepted", "packing", "ready", "out_for_delivery"];
export const HANDLING_FEE = 500; // ₹5 per order

export type StoreRow = {
  id: string; name: string; area: string; address: string; phone: string; lat: number; lng: number;
  open_time: string; close_time: string; prep_minutes: number; accepting_orders: boolean;
  max_active_orders: number; delivery_fee: number; free_delivery_above: number;
};

function minutesIST(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const m = Number(parts.find((p) => p.type === "minute")!.value);
  return h * 60 + m;
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export function isOpenNow(s: Pick<StoreRow, "open_time" | "close_time">, now = new Date()): boolean {
  const o = toMin(s.open_time), c = toMin(s.close_time), n = minutesIST(now);
  if (o === c || (o === 0 && c >= 1440)) return true;
  return o < c ? n >= o && n < c : n >= o || n < c;
}

const fmt12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 || h === 24 ? "am" : "pm"}`;
};
export function hoursLabel(s: Pick<StoreRow, "open_time" | "close_time">) {
  if (s.open_time === "00:00" && s.close_time === "24:00") return "Open 24 hours";
  return `${fmt12(s.open_time)} – ${fmt12(s.close_time)}`;
}

export type Workload = { active: number; freeRiders: number };

export async function storeWorkload(q: Q, storeId: string): Promise<Workload> {
  const { rows } = await q(
    `SELECT
       (SELECT count(*)::int FROM orders WHERE store_id=$1 AND status IN ('placed','accepted','packing')) AS active,
       (SELECT count(*)::int FROM riders r WHERE r.home_store_id=$1 AND NOT EXISTS (
          SELECT 1 FROM orders o WHERE o.rider_id=r.id AND o.status IN ('accepted','packing','ready','out_for_delivery'))) AS free_riders`,
    [storeId],
  );
  return { active: rows[0].active, freeRiders: rows[0].free_riders };
}

/**
 * Delivery estimate in minutes from now, built from packing time, store workload,
 * rider availability and road travel time. Returned as a window, never a single promise.
 */
export function estimateWindow(parts: { prep: number; workload: Workload; travelMin: number; stage?: string; stageElapsedMin?: number }) {
  const { prep, workload, travelMin } = parts;
  const stage = parts.stage ?? "placed";
  const elapsed = parts.stageElapsedMin ?? 0;
  const queue = Math.max(0, workload.active - 1) * 1.5; // others ahead in the packing queue
  const riderWait = workload.freeRiders > 0 ? 2 : 8;
  let remaining: number;
  switch (stage) {
    case "placed": remaining = 2 + prep + queue + riderWait + travelMin; break;
    case "accepted": remaining = Math.max(1, prep + queue - elapsed) + riderWait + travelMin; break;
    case "packing": remaining = Math.max(2, prep - elapsed) + riderWait + travelMin; break;
    case "ready": remaining = Math.max(1, riderWait - elapsed) + travelMin; break;
    case "out_for_delivery": remaining = Math.max(2, travelMin - elapsed); break;
    default: remaining = 0;
  }
  const min = Math.max(1, Math.round(remaining));
  const max = min + 4 + Math.ceil(min * 0.15);
  return { min, max };
}

export async function nearbyStores(q: Q, point: LatLng): Promise<StoreSummary[]> {
  const { rows } = await q<StoreRow>(`SELECT * FROM stores ORDER BY id`);
  const out: StoreSummary[] = [];
  for (const s of rows) {
    const d = distanceMeters(point, s);
    const eligibleDistance = isWithinServiceRadius(d);
    const open = isOpenNow(s);
    const workload = await storeWorkload(q, s.id);
    const atCapacity = workload.active >= s.max_active_orders;
    const travel = await router().travel(s, point);
    const w = estimateWindow({ prep: s.prep_minutes, workload, travelMin: travel.minutes });
    let reason: string | undefined;
    if (!eligibleDistance) reason = `${formatKm(d)} away — outside the 3 km delivery area`;
    else if (!open) reason = `Closed now · ${hoursLabel(s)}`;
    else if (!s.accepting_orders) reason = "Not accepting orders right now";
    else if (atCapacity) reason = "Very busy — not taking new orders for a few minutes";
    out.push({
      id: s.id, name: s.name, area: s.area, lat: s.lat, lng: s.lng,
      distanceM: Math.round(d), distanceLabel: formatKm(d),
      eligible: eligibleDistance && open && s.accepting_orders && !atCapacity,
      open, acceptingOrders: s.accepting_orders, atCapacity, hoursLabel: hoursLabel(s), reason,
      etaMin: w.min, etaMax: w.max, deliveryFee: s.delivery_fee, freeDeliveryAbove: s.free_delivery_above,
    });
  }
  // Fastest eligible first; then other in-range stores; out-of-range last.
  return out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.etaMin - b.etaMin || a.distanceM - b.distanceM);
}

export async function getStore(q: Q, id: string): Promise<StoreRow | null> {
  const { rows } = await q<StoreRow>(`SELECT * FROM stores WHERE id=$1`, [id]);
  return rows[0] ?? null;
}
