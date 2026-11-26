import { body, handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { setPlus } from "@/lib/server/account";

// KripFresh Plus membership (payment simulated). { action: "join" | "cancel" | "resume" }
export const POST = handle(async (req) => ({ account: await setPlus(await requireCustomer(), String((await body(req)).action)) }));
