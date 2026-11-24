import type { Metadata } from "next";
import { StoreShell } from "@/components/store/StoreShell";

export const metadata: Metadata = { title: "KripFresh Store" };

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
