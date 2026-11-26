import { handle } from "@/lib/server/http";
import { query } from "@/lib/server/db";
import { suggest } from "@/lib/server/catalogue";

export const GET = handle<{ id: string }>(async (req, { id }) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 40);
  return { suggestions: await suggest(query, id, q) };
});
