import { ApiError, handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { commitImport, previewImport } from "@/lib/server/inventory";
import { parseTable } from "@/lib/server/parse-table";

// multipart/form-data: file, mode=preview|commit
export const POST = handle(async (req) => {
  const storeId = await requireRole("store");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "NO_FILE", "Choose a CSV or Excel file.");
  const table = await parseTable(file);
  if (form!.get("mode") === "commit") return { result: await commitImport(storeId, table) };
  return await previewImport(storeId, table);
});
