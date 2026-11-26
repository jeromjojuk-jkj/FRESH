import { body, handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { updateInventoryItem } from "@/lib/server/inventory";

export const PATCH = handle<{ id: string }>(async (req, { id }) => updateInventoryItem(await requireRole("store"), Number(id), await body(req)));
