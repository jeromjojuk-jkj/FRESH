"use client";
import { useState } from "react";
import { ApiErr } from "@/lib/client/api";
import { rupees } from "@/lib/money";
import { Button, ErrorBox, Notice } from "@/components/ui";
import { IconUpload } from "@/components/icons";

const TEMPLATE = `barcode,product name,category,pack size,selling price,stock quantity
0200000000011,Tomato (Hybrid),Fruits & Vegetables,500 g,26,40
8900000000017,Toned Milk,Dairy & Eggs,500 ml,27,60
0012345678905,Ragi Flour,Rice & Grains,1 kg,78,25
`;

async function upload(file: File, mode: "preview" | "commit") {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("mode", mode);
  let res: Response;
  try { res = await fetch("/api/v1/store/import", { method: "POST", body: fd }); }
  catch { throw new ApiErr(0, "NETWORK", "Upload failed — check your connection and try again.", undefined, true); }
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new ApiErr(res.status, j?.error?.code, j?.error?.message ?? "Upload failed.");
  return j;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ rows: any[]; missingColumns: string[] } | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f: File | null) => {
    setFile(f); setPreview(null); setResult(null); setErr(null);
    if (!f) return;
    setBusy(true);
    try { setPreview(await upload(f, "preview")); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const commit = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try { setResult((await upload(file, "commit")).result); setPreview(null); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const counts = preview ? { create: preview.rows.filter((r) => r.action === "create").length, update: preview.rows.filter((r) => r.action === "update").length, error: preview.rows.filter((r) => r.action === "error").length } : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Import products</h1>
      <p className="text-sm text-ink-2">Upload a CSV or Excel (.xlsx) file with these columns: <strong className="text-ink">barcode, product name, category, pack size, selling price, stock quantity</strong>. You’ll see a preview before anything changes.</p>
      <Notice>Barcodes are kept exactly as written, including leading zeros (e.g. 0200000000011). In Excel, format the barcode column as <strong>Text</strong> before typing.</Notice>
      <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="kripfresh-import-template.csv" className="inline-flex min-h-11 items-center font-semibold text-brand underline">Download a sample CSV</a>

      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-brand bg-mint/50 p-4 text-center hover:bg-mint">
        <IconUpload className="h-7 w-7 text-brand" />
        <span className="font-semibold">{file ? file.name : "Choose a CSV or Excel file"}</span>
        <span className="text-xs text-ink-2">Up to 5 MB · first sheet is used</span>
        <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} data-testid="import-file" />
      </label>

      {busy && !preview ? <p role="status" className="text-sm">Reading file…</p> : null}
      {err ? <ErrorBox message={err} onRetry={file ? () => pick(file) : undefined} /> : null}
      {result ? <Notice><strong>Import complete.</strong> {result.created} added, {result.updated} updated{result.skipped ? `, ${result.skipped} skipped because of errors` : ""}.</Notice> : null}

      {preview?.missingColumns.length ? <ErrorBox message={`Missing columns: ${preview.missingColumns.join(", ")}. Check the header row.`} /> : null}
      {preview && counts && !preview.missingColumns.length ? (
        <section aria-labelledby="pv-h" className="space-y-3">
          <h2 id="pv-h" className="text-base font-semibold">Preview: {counts.create} new · {counts.update} updates · {counts.error} with errors</h2>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-mint text-xs"><tr><th className="p-2">Row</th><th className="p-2">Barcode</th><th className="p-2">Product</th><th className="p-2">Category</th><th className="p-2">Pack</th><th className="p-2">Price</th><th className="p-2">Stock</th><th className="p-2">Result</th></tr></thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((r) => (
                  <tr key={r.line} className={r.action === "error" ? "bg-danger-bg" : ""}>
                    <td className="p-2">{r.line}</td>
                    <td className="p-2 font-mono" data-testid="pv-barcode">{r.barcode}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2">{r.packSize}</td>
                    <td className="p-2">{r.price ? rupees(r.price) : "—"}</td>
                    <td className="p-2">{Number.isFinite(r.stock) ? r.stock : "—"}</td>
                    <td className="p-2 font-semibold">{r.action === "error" ? <span className="text-danger">{r.errors.join("; ")}</span> : r.action === "create" ? "New product" : "Update"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="lg" className="w-full sm:w-auto" onClick={commit} busy={busy} disabled={counts.create + counts.update === 0}>
            Import {counts.create + counts.update} product{counts.create + counts.update === 1 ? "" : "s"}{counts.error ? ` (skip ${counts.error})` : ""}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
