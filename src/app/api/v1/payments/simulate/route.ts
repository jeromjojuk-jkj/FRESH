import { ApiError, body, handle } from "@/lib/server/http";
import { simulatePaymentRef } from "@/lib/server/providers/payments";
import { requireCustomer } from "@/lib/server/session";

// DEMO ONLY: pretends a UPI app approved the payment. No money moves.
export const POST = handle(async (req) => {
  await requireCustomer();
  const { outcome } = await body(req);
  if (outcome === "fail") throw new ApiError(402, "PAYMENT_FAILED", "The simulated payment was declined. No money was taken.");
  return { ref: simulatePaymentRef(), simulated: true };
});
