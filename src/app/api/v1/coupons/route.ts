import { handle } from "@/lib/server/http";
import { couponList } from "@/lib/server/account";

export const GET = handle(async () => ({ coupons: await couponList() }));
