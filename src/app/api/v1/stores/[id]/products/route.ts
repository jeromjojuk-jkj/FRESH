import { handle } from "@/lib/server/http";
import { query } from "@/lib/server/db";
import { buyAgain, catalogue, featured, search } from "@/lib/server/catalogue";
import { requireCustomer } from "@/lib/server/session";

// Everything is scoped to one store: its own stock and its own prices.
export const GET = handle<{ id: string }>(async (req, { id }) => {
  const u = new URL(req.url);
  const section = u.searchParams.get("section");
  const q = u.searchParams.get("q");
  if (q) return { products: await search(query, id, q.slice(0, 80)) };
  if (section === "featured") return { products: await featured(query, id) };
  if (section === "buy-again") return { products: await buyAgain(query, id, await requireCustomer()) };
  return { products: await catalogue(query, id, u.searchParams.get("category") ?? undefined) };
});
