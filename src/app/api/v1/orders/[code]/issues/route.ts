import { body, handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { getCustomerOrder, reportIssue } from "@/lib/server/orders";

export const POST = handle<{ code: string }>(async (req, { code }) => {
  const c = await requireCustomer();
  const result = await reportIssue(c, code, await body(req));
  return { result, order: await getCustomerOrder(c, code) };
});
