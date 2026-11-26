import { ApiError, body, handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { riderAction } from "@/lib/server/orders";

export const POST = handle<{ code: string }>(async (req, { code }) => {
  const riderId = await requireRole("rider");
  const { action } = await body(req);
  if (action !== "pickup" && action !== "deliver") throw new ApiError(400, "BAD_ACTION", "Unknown action.");
  return riderAction(riderId, code, action);
});
