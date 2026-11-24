import { ApiError, handle } from "@/lib/server/http";
import { resetDatabase } from "@/lib/server/db";

export const POST = handle(async () => {
  if (process.env.DISABLE_DEMO === "1") throw new ApiError(403, "DEMO_DISABLED", "Demo reset is disabled.");
  await resetDatabase();
  return { ok: true };
});
