import { body, handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { storeSettings, updateSettings } from "@/lib/server/inventory";

export const GET = handle(async () => ({ settings: await storeSettings(await requireRole("store")) }));
export const PATCH = handle(async (req) => ({ settings: await updateSettings(await requireRole("store"), await body(req)) }));
