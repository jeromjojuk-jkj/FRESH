import { body, handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { setRiderSharing } from "@/lib/server/orders";

export const POST = handle(async (req) => setRiderSharing(await requireRole("rider"), !!(await body(req)).on));
