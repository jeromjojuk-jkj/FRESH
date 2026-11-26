/**
 * Notification integration point (SMS / WhatsApp / push). Every customer-facing
 * update is also written to order_events, which the tracking screen shows, so the
 * demo works without any provider. Plug MSG91/Twilio/FCM in here.
 */
export async function notifyCustomer(phone: string | null, message: string): Promise<void> {
  if (process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== "console") {
    // TODO: call the real provider with credentials kept on the server.
  }
  if (process.env.NODE_ENV !== "test" && process.env.LOG_NOTIFICATIONS === "1") console.log(`[notify ${phone ?? "-"}] ${message}`);
}
