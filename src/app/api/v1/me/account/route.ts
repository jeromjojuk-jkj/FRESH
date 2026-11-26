import { body, handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { accountView, updateProfile } from "@/lib/server/account";

export const GET = handle(async () => ({ account: await accountView(await requireCustomer()) }));
export const PATCH = handle(async (req) => ({ account: await updateProfile(await requireCustomer(), await body(req)) }));
