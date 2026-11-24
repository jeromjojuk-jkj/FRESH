import { handle } from "@/lib/server/http";
import { geocoder } from "@/lib/server/providers/geocoding";

export const GET = handle(async (req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 120);
  return { results: await geocoder().search(q) };
});
