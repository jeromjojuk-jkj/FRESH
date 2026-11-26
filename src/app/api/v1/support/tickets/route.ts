import { handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { listTickets } from "@/lib/server/orders";

export const GET = handle(async () => ({ tickets: await listTickets(await requireCustomer()) }));
