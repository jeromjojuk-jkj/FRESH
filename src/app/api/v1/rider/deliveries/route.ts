import { handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { listRiderDeliveries } from "@/lib/server/orders";

export const GET = handle(async () => listRiderDeliveries(await requireRole("rider")));
