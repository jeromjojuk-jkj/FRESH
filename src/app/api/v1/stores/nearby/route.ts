import { ApiError, body, handle } from "@/lib/server/http";
import { query } from "@/lib/server/db";
import { nearbyStores } from "@/lib/server/stores";
import { isValidLatLng } from "@/lib/geo";

// Straight-line distance is computed here on the server; 3.00 km inclusive.
export const POST = handle(async (req) => {
  const p = await body(req);
  if (!isValidLatLng(p)) throw new ApiError(400, "BAD_LOCATION", "Please confirm your delivery location.");
  const stores = await nearbyStores(query, { lat: p.lat, lng: p.lng });
  return { stores, eligibleCount: stores.filter((s) => s.eligible).length };
});
