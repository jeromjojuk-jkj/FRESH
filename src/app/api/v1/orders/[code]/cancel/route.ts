import { body, handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { cancelByCustomer, getCustomerOrder } from "@/lib/server/orders";

export const POST = handle<{ code: string }>(async (req, { code }) => {
  const c = await requireCustomer();
  await cancelByCustomer(c, code, (await body(req)).reason);
  return { order: await getCustomerOrder(c, code) };
});
