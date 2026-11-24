import { randomBytes } from "node:crypto";
import { ApiError } from "../http";
import type { PaymentMethod } from "../../types";

/**
 * Payment integration point. Cash on delivery needs nothing. "upi_demo" is a
 * clearly-labelled simulation; replace SimulatedUpi with a real gateway
 * (Razorpay / Cashfree / PhonePe PG) that creates an intent server-side and
 * verifies the signed callback before the order is confirmed.
 */
export interface PaymentProvider {
  method: PaymentMethod;
  label: string;
  simulated: boolean;
  /** Called after server re-validation, with the final amount in paise. */
  authorise(amountPaise: number, ref: string | undefined): Promise<{ status: "pending_cod" | "paid"; ref: string | null }>;
  refund?(ref: string, amountPaise: number): Promise<void>;
}

const cod: PaymentProvider = {
  method: "cod",
  label: "Cash on delivery",
  simulated: false,
  async authorise() { return { status: "pending_cod", ref: null }; },
};

const simulatedUpi: PaymentProvider = {
  method: "upi_demo",
  label: "UPI (simulated demo — no money moves)",
  simulated: true,
  async authorise(_amount, ref) {
    if (!ref || !ref.startsWith("SIMUPI-")) throw new ApiError(402, "PAYMENT_REQUIRED", "Payment was not completed. Please try again or choose cash on delivery.");
    return { status: "paid", ref };
  },
  async refund() {},
};

export function paymentProvider(method: string): PaymentProvider {
  if (method === "cod") return cod;
  if (method === "upi_demo") {
    if (process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== "simulated") {
      throw new ApiError(501, "PAYMENT_NOT_CONFIGURED", "Online payment gateway is not configured yet.");
    }
    return simulatedUpi;
  }
  throw new ApiError(400, "BAD_PAYMENT_METHOD", "Choose a payment method.");
}

export function simulatePaymentRef() {
  return "SIMUPI-" + randomBytes(5).toString("hex").toUpperCase();
}
