import { distanceMeters, type LatLng } from "../../geo";

/** Road travel estimate, kept separate from the straight-line eligibility rule. */
export type Travel = { roadKm: number; minutes: number; provider: string };

export interface RoadRouter {
  travel(from: LatLng, to: LatLng): Promise<Travel>;
}

const AVG_SPEED_KMH = 18; // two-wheeler in city traffic
const HANDOVER_MIN = 2;   // parking, lift, handover

/** Demo: road distance ≈ 1.35 × straight line. */
export class DemoRouter implements RoadRouter {
  async travel(from: LatLng, to: LatLng): Promise<Travel> {
    const roadKm = (distanceMeters(from, to) / 1000) * 1.35;
    return { roadKm, minutes: Math.ceil((roadKm / AVG_SPEED_KMH) * 60 + HANDOVER_MIN), provider: "demo" };
  }
}

/** OSRM (self-hosted or public demo). Falls back to the demo estimate on failure. */
class OsrmRouter implements RoadRouter {
  private demo = new DemoRouter();
  async travel(from: LatLng, to: LatLng): Promise<Travel> {
    try {
      const base = process.env.OSRM_URL || "https://router.project-osrm.org";
      const r = await fetch(`${base}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`, { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      const route = j?.routes?.[0];
      if (!route) return this.demo.travel(from, to);
      const roadKm = route.distance / 1000;
      return { roadKm, minutes: Math.ceil((roadKm / AVG_SPEED_KMH) * 60 + HANDOVER_MIN), provider: "osrm" };
    } catch {
      return this.demo.travel(from, to);
    }
  }
}

export function router(): RoadRouter {
  return process.env.ROUTING_PROVIDER === "osrm" ? new OsrmRouter() : new DemoRouter();
}
