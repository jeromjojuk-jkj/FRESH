import { body, handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { updateRiderLocation } from "@/lib/server/orders";

export const POST = handle(async (req) => {
  const b = await body(req);
  return updateRiderLocation(await requireRole("rider"), Number(b.lat), Number(b.lng), b.accuracy != null ? Number(b.accuracy) : undefined);
});
