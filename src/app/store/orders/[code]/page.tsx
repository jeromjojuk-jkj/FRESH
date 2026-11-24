"use client";
import { use, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { useApi } from "@/lib/client/hooks";
import { timeIST } from "@/lib/format";
import { rupees } from "@/lib/money";
import { Button, ErrorBox, Notice, Skeleton } from "@/components/ui";
import { IconAlert, IconBack, IconCheck, IconMinus, IconPhone, IconPlus } from "@/components/icons";

export default function PackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data, error, reload, setData } = useApi<{ order: any }>(`/store/orders/${code}`, { pollMs: 5000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const o = data?.order;

  const act = async (action: string, extra: object = {}, key = action) => {
    setBusy(key); setErr(null);
    try { const r = await api<{ order: any }>(`/store/orders/${code}`, { method: "POST", json: { action, ...extra } }); setData(r); }
    catch (e: any) { setErr(e.message); reload(); }
    finally { setBusy(null); }
  };

  if (error && !o) return <ErrorBox message={error.message} onRetry={reload} />;
  if (!o) return <Skeleton className="h-64" />;

  const lines = o.items as any[];
  const open = lines.filter((i) => i.status === "pending" || i.status === "short");
  const packing = o.status === "packing";

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <Link href="/store" className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-mint" aria-label="Back to orders"><IconBack /></Link>
        <h1 className="flex-1 text-xl font-bold">{o.code}</h1>
        <span className="rounded-full bg-fresh px-3 py-1 text-sm font-semibold">{o.statusLabel}</span>
      </div>
      <p className="text-sm text-ink-2">
        {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {rupees(o.total)} · Pickup by <strong className="text-ink">{timeIST(o.expectedPickupAt)}</strong>
        {o.rider ? <> · Rider: <strong className="text-ink">{o.rider.name}</strong></> : null}
      </p>
      <Notice>If something is missing: <strong>{o.substitutionPref === "contact" ? "contact the customer — they choose a replacement or removal" : "remove it — the customer agreed"}</strong>. Never substitute without the customer’s choice.</Notice>
      {err ? <ErrorBox message={err} /> : null}

      {o.status === "accepted" ? (
        <Button size="lg" className="w-full text-lg" onClick={() => act("start_packing")} busy={busy === "start_packing"} data-testid="start-packing">Start packing</Button>
      ) : null}
      {o.status === "placed" ? <Notice tone="warn">Accept this order from the New orders list first.</Notice> : null}

      <section aria-labelledby="list-h">
        <h2 id="list-h" className="mb-2 text-base font-semibold">Packing checklist {packing ? `· ${lines.length - open.length} of ${lines.length} done` : ""}</h2>
        <ul className="space-y-3">
          {lines.map((i) => <PackRow key={i.id} item={i} packing={packing} busy={busy} act={act} customerPhone={o.customer?.phone} />)}
        </ul>
      </section>

      <section className="rounded-2xl border border-line p-3 text-sm">
        <p className="font-semibold">Deliver to</p>
        <p className="text-ink-2">{[o.address.flat, o.address.floor && `${o.address.floor} floor`, o.address.line].filter(Boolean).join(", ")}</p>
      </section>

      {packing ? (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-white px-4 py-3 md:bottom-0">
          <div className="mx-auto max-w-5xl">
            <Button size="lg" className="w-full text-lg" disabled={open.length > 0} busy={busy === "ready"} onClick={() => act("ready")} data-testid="mark-ready">
              <IconCheck /> Mark ready for pickup
            </Button>
            {open.length ? <p className="mt-1 text-center text-xs font-semibold text-warn">{open.length} item{open.length > 1 ? "s" : ""} still to pack or resolve</p> : null}
          </div>
        </div>
      ) : null}
      {o.status === "ready" ? <Notice>Ready. Waiting for {o.rider?.name ?? "the rider"} to pick up.</Notice> : null}
    </div>
  );
}

function PackRow({ item: i, packing, busy, act, customerPhone }: { item: any; packing: boolean; busy: string | null; act: (a: string, x?: object, k?: string) => void; customerPhone?: string }) {
  const need = i.qty;
  const packed = i.packedQty;
  const done = i.status === "packed" || i.status === "removed" || i.status === "replaced";
  const short = need - packed;
  const state =
    i.status === "short" ? { tone: "warn", text: `Need ${need}, packed ${packed} — waiting for customer` } :
    i.status === "removed" ? { tone: "muted", text: `Removed (${i.removedQty} unavailable)` } :
    i.status === "replaced" ? { tone: "muted", text: `Replaced — pack the replacement below` } :
    i.removedQty > 0 ? { tone: "ok", text: `Packed ${packed} of ${need} · ${i.removedQty} removed` } :
    done ? { tone: "ok", text: `All ${need} packed` } :
    packed > 0 ? { tone: "warn", text: `Need ${need}, packed ${packed}` } :
    { tone: "todo", text: `Need ${need}` };
  const toneCls = { warn: "bg-warn-bg text-warn", ok: "bg-fresh text-ink", muted: "bg-mint text-ink-2", todo: "bg-white text-ink border border-line" }[state.tone as "warn"];

  return (
    <li className={`rounded-[var(--radius-card)] border-2 p-3 ${done ? "border-line bg-mint/40" : i.status === "short" ? "border-warn" : "border-line"}`}>
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={i.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-mint object-contain p-1.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{i.name}</p>
          <p className="mt-0.5"><span className="inline-block rounded-lg bg-ink px-2 py-0.5 text-sm font-bold text-white">{i.packLabel}</span>{i.replacesItemId ? <span className="ml-2 text-xs font-semibold text-brand">Replacement approved by customer</span> : null}</p>
          <p className={`mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-bold ${toneCls}`}>
            {done ? <IconCheck className="h-4 w-4" /> : i.status === "short" || packed > 0 ? <IconAlert className="h-4 w-4" /> : null}{state.text}
          </p>
        </div>
        <div className="shrink-0 text-right"><p className="text-xs text-ink-2">Qty</p><p className="text-3xl font-bold leading-none">{need}</p></div>
      </div>

      {packing && i.status === "pending" ? (
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <div className="flex h-12 items-stretch overflow-hidden rounded-xl border-2 border-brand" role="group" aria-label={`Packed count for ${i.name}`}>
            <button className="grid w-12 place-items-center text-brand hover:bg-mint disabled:opacity-40" disabled={packed <= 0} onClick={() => act("pack_item", { itemId: i.id, packedQty: packed - 1 }, `p${i.id}`)} aria-label="One less packed"><IconMinus /></button>
            <output className="grid w-16 place-items-center text-sm font-bold" aria-live="polite">{packed}/{need}</output>
            <button className="grid w-12 place-items-center text-brand hover:bg-mint disabled:opacity-40" disabled={packed >= need} onClick={() => act("pack_item", { itemId: i.id, packedQty: packed + 1 }, `p${i.id}`)} aria-label="One more packed"><IconPlus /></button>
          </div>
          <Button onClick={() => act("pack_item", { itemId: i.id, packedQty: need }, `all${i.id}`)} busy={busy === `all${i.id}`} data-testid={`pack-all-${i.id}`}><IconCheck /> Packed all {need}</Button>
          <Button variant="danger" className="col-span-2" onClick={() => act("report_missing", { itemId: i.id }, `m${i.id}`)} busy={busy === `m${i.id}`} data-testid={`missing-${i.id}`}>
            <IconAlert /> Report missing{packed > 0 ? ` (${short} not found)` : ""}
          </Button>
        </div>
      ) : null}
      {packing && i.status === "short" ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>The customer has been asked to choose a replacement or remove it. This screen updates automatically. If you can’t reach them, remove the item.</p>
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${(customerPhone ?? "").replace(/\s/g, "")}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-brand font-semibold text-brand"><IconPhone className="h-5 w-5" /> Call customer</a>
            <Button variant="danger" onClick={() => act("remove_short", { itemId: i.id }, `rs${i.id}`)} busy={busy === `rs${i.id}`}>Remove item</Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
