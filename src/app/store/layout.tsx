import type { Metadata } from "next";
import { StoreShell } from "@/components/store/StoreShell";

export const metadata: Metadata = { title: "NearBasket Store" };

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
