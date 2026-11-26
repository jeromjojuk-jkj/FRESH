import { handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { inventory } from "@/lib/server/inventory";

export const GET = handle(async (req) => ({ items: await inventory(await requireRole("store"), new URL(req.url).searchParams.get("q") ?? "") }));
