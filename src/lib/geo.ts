// Shared geo helpers. Straight-line ("as the crow flies") distance on a sphere.
export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371008.8;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Haversine distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point reached by travelling `meters` from `p` on `bearingDeg`. */
export function destinationPoint(p: LatLng, bearingDeg: number, meters: number): LatLng {
  const d = meters / EARTH_RADIUS_M;
  const b = toRad(bearingDeg);
  const lat1 = toRad(p.lat);
  const lng1 = toRad(p.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 =
    lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

/** Service radius: 3.00 km, inclusive. */
export const SERVICE_RADIUS_M = 3000;

/**
 * A store is eligible when its straight-line distance, measured to the whole metre,
 * is at most 3,000 m. 3.000 km is in; 3.001 km and beyond is out.
 * Rounding to the metre absorbs floating-point noise (e.g. 2999.9999997 or 3000.0000004).
 */
export function isWithinServiceRadius(meters: number): boolean {
  return Math.round(meters) <= SERVICE_RADIUS_M;
}

export function formatKm(meters: number): string {
  return `${(Math.round(meters / 10) / 100).toFixed(2)} km`;
}

export function isValidLatLng(p: unknown): p is LatLng {
  if (!p || typeof p !== "object") return false;
  const { lat, lng } = p as LatLng;
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}
