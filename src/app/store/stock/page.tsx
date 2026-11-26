"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useApi } from "@/lib/client/hooks";
import { tintFor } from "@/components/customer/ProductCard";
import { rupees } from "@/lib/money";
import { ErrorBox, Skeleton, inputCls } from "@/components/ui";
import { IconCheck, IconMinus, IconPlus, IconSearch } from "@/components/icons";

export default function StockPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, error, reload } = useApi<{ items: any[] }>(`/store/inventory?q=${encodeURIComponent(debounced)}`);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Stock & prices</h1>
      <div className="relative">
        <label htmlFor="inv-q" className="sr-only">Search your products</label>
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />
        <input id="inv-q" className={`${inputCls} pl-11`} placeholder="Search by name, brand or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-ink-2">Changes save as soon as you tap Save. Out-of-stock items are listed first.</p>
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : !data ? <Skeleton className="h-64" /> : (
        <ul className="space-y-2">{data.items.map((it) => <StockRow key={it.id} it={it} />)}</ul>
      )}
    </div>
  );
}

function StockRow({ it }: { it: any }) {
  const [price, setPrice] = useState(String(it.price / 100));
  const [stock, setStock] = useState<number>(it.stock);
  const [active, setActive] = useState<boolean>(it.active);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const dirty = Math.round(Number(price) * 100) !== it.price || stock !== it.stock || active !== it.active;

  const save = async () => {
    setState("saving"); setErr(null);
    try {
      await api(`/store/inventory/${it.id}`, { method: "PATCH", json: { price: Math.round(Number(price) * 100), stock, active } });
      it.price = Math.round(Number(price) * 100); it.stock = stock; it.active = active;
      setState("saved");
    } catch (e: any) { setErr(e.message); setState("error"); }
  };

  return (
    <li className={`rounded-[22px] p-3 ${stock === 0 ? "bg-warn-bg/60 ring-1 ring-warn" : "bg-white shadow-[0_4px_18px_-10px_rgba(0,0,0,.25)]"}`}>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={it.image} alt="" className={`h-12 w-12 shrink-0 rounded-[14px] object-contain p-1.5 ${tintFor(it.productId)}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{it.name} <span className="rounded bg-mint px-1.5 text-xs">{it.packLabel}</span></p>
          <p className="text-xs text-ink-2">Barcode {it.barcode ?? "—"} · MRP {rupees(it.mrp)}{stock === 0 ? <strong className="ml-1 text-warn">· Out of stock</strong> : null}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`p-${it.id}`} className="block text-xs font-medium">Price (₹)</label>
          <input id={`p-${it.id}`} inputMode="decimal" className={`${inputCls} w-24`} value={price} onChange={(e) => { setPrice(e.target.value.replace(/[^\d.]/g, "")); setState("idle"); }} />
        </div>
        <div>
          <span className="block text-xs font-medium" id={`s-${it.id}`}>Stock</span>
          <div className="flex h-12 items-stretch overflow-hidden rounded-xl border-2 border-line" role="group" aria-labelledby={`s-${it.id}`}>
            <button className="grid w-11 place-items-center hover:bg-mint" onClick={() => { setStock((s) => Math.max(0, s - 1)); setState("idle"); }} aria-label="Decrease stock"><IconMinus /></button>
            <input aria-label={`Stock for ${it.name} ${it.packLabel}`} inputMode="numeric" className="w-14 text-center text-sm font-bold focus:outline-none" value={stock} onChange={(e) => { setStock(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0)); setState("idle"); }} />
            <button className="grid w-11 place-items-center hover:bg-mint" onClick={() => { setStock((s) => s + 1); setState("idle"); }} aria-label="Increase stock"><IconPlus /></button>
          </div>
        </div>
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={active} onChange={(e) => { setActive(e.target.checked); setState("idle"); }} className="h-5 w-5 accent-[#1C9A41]" /> Selling
        </label>
        <button onClick={save} disabled={!dirty || state === "saving"} className="ml-auto inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:bg-[#A6DDB4]">
          {state === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
      {state === "saved" && !dirty ? <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand" role="status"><IconCheck className="h-4 w-4" /> Saved</p> : null}
      {err ? <p className="mt-1 text-xs font-semibold text-danger" role="alert">{err}</p> : null}
    </li>
  );
}
