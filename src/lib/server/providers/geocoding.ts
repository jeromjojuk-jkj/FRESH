import { DEMO_LOCALITIES } from "../../demo-data";
import { distanceMeters, type LatLng } from "../../geo";

export type GeoResult = { line: string; lat: number; lng: number; provider: string; approximate: boolean };

export interface Geocoder {
  reverse(p: LatLng): Promise<GeoResult | null>;
  search(q: string): Promise<GeoResult[]>;
}

/** Offline demo geocoder: snaps to the nearest known locality. Clearly marked as demo. */
class DemoGeocoder implements Geocoder {
  async reverse(p: LatLng) {
    let best = DEMO_LOCALITIES[0];
    let bestD = Infinity;
    for (const l of DEMO_LOCALITIES) {
      const d = distanceMeters(p, l);
      if (d < bestD) { best = l; bestD = d; }
    }
    const near = bestD < 4000 ? `Near ${best.name}` : "Unnamed road";
    return { line: `${near}, Bengaluru ${bestD < 4000 ? best.pin : ""}`.trim(), lat: p.lat, lng: p.lng, provider: "demo", approximate: true };
  }
  async search(q: string) {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return DEMO_LOCALITIES.filter((l) => l.name.toLowerCase().includes(s) || l.pin.startsWith(s)).map((l) => ({
      line: `${l.name}, Bengaluru ${l.pin}`, lat: l.lat, lng: l.lng, provider: "demo", approximate: true,
    }));
  }
}

/** OpenStreetMap Nominatim. Respect their usage policy (1 req/s, contact address) or self-host. */
class NominatimGeocoder implements Geocoder {
  private base = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
  private headers = { "User-Agent": `NearBasket/0.1 (${process.env.GEOCODER_CONTACT || "contact-not-set"})`, "Accept-Language": "en-IN" };
  async reverse(p: LatLng) {
    const r = await fetch(`${this.base}/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}`, { headers: this.headers, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.display_name ? { line: j.display_name, lat: p.lat, lng: p.lng, provider: "nominatim", approximate: false } : null;
  }
  async search(q: string) {
    const r = await fetch(`${this.base}/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(q)}`, { headers: this.headers, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const j = (await r.json()) as any[];
    return j.map((x) => ({ line: x.display_name, lat: Number(x.lat), lng: Number(x.lon), provider: "nominatim", approximate: false }));
  }
}

/** Falls back to the demo geocoder if the real one fails, so the address flow never dead-ends. */
class WithFallback implements Geocoder {
  constructor(private primary: Geocoder, private fallback: Geocoder) {}
  async reverse(p: LatLng) {
    try { return (await this.primary.reverse(p)) ?? (await this.fallback.reverse(p)); } catch { return this.fallback.reverse(p); }
  }
  async search(q: string) {
    try { const r = await this.primary.search(q); return r.length ? r : this.fallback.search(q); } catch { return this.fallback.search(q); }
  }
}

export function geocoder(): Geocoder {
  const demo = new DemoGeocoder();
  return process.env.GEOCODER_PROVIDER === "nominatim" ? new WithFallback(new NominatimGeocoder(), demo) : demo;
}
