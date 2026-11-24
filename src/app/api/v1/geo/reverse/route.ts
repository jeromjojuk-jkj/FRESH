import { ApiError, handle } from "@/lib/server/http";
import { geocoder } from "@/lib/server/providers/geocoding";
import { isValidLatLng } from "@/lib/geo";

export const GET = handle(async (req) => {
  const u = new URL(req.url);
  const p = { lat: Number(u.searchParams.get("lat")), lng: Number(u.searchParams.get("lng")) };
  if (!isValidLatLng(p)) throw new ApiError(400, "BAD_LOCATION", "Invalid coordinates.");
  return { result: await geocoder().reverse(p) };
});
