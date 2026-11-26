import { handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { getCustomerOrder } from "@/lib/server/orders";

export const GET = handle<{ code: string }>(async (_req, { code }) => ({ order: await getCustomerOrder(await requireCustomer(), code) }));
