"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useApi } from "@/lib/client/hooks";
import { Button, ErrorBox, Field, Notice, Skeleton, inputCls } from "@/components/ui";
import { IconMinus, IconPlus } from "@/components/icons";

export default function SettingsPage() {
  const { data, error, reload, setData } = useApi<{ settings: any }>("/store/settings");
  const [f, setF] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !f) setF({ ...data.settings, is24: data.settings.openTime === "00:00" && data.settings.closeTime === "24:00" }); }, [data, f]);
  if (error) return <ErrorBox message={error.message} onRetry={reload} />;
  if (!f) return <Skeleton className="h-64" />;

  const save = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await api<{ settings: any }>("/store/settings", { method: "PATCH", json: {
        acceptingOrders: f.acceptingOrders, prepMinutes: f.prepMinutes, maxActiveOrders: f.maxActiveOrders,
        openTime: f.is24 ? "00:00" : f.openTime, closeTime: f.is24 ? "24:00" : f.closeTime,
      } });
      setData(r); setMsg("Settings saved.");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const step = (k: string, d: number, min: number, max: number) => setF({ ...f, [k]: Math.min(max, Math.max(min, f[k] + d)) });

  return (
    <div className="max-w-lg space-y-5 pb-6">
      <h1 className="text-xl font-bold">Store settings</h1>
      <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 ${f.acceptingOrders ? "border-brand bg-fresh/50" : "border-warn bg-warn-bg"}`}>
        <input type="checkbox" checked={f.acceptingOrders} onChange={(e) => setF({ ...f, acceptingOrders: e.target.checked })} className="h-6 w-6 accent-[#1C9A41]" />
        <span><span className="block font-semibold">{f.acceptingOrders ? "Accepting orders" : "Not accepting orders"}</span><span className="block text-xs text-ink-2">Turn off to pause new orders. Orders in progress are not affected.</span></span>
      </label>

      <fieldset className="space-y-3 rounded-[22px] bg-white p-4 shadow-[0_4px_18px_-10px_rgba(0,0,0,.25)]">
        <legend className="px-1 font-semibold">Opening hours</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={f.is24} onChange={(e) => setF({ ...f, is24: e.target.checked, openTime: e.target.checked ? f.openTime : "07:00", closeTime: e.target.checked ? f.closeTime : "22:00" })} className="h-5 w-5 accent-[#1C9A41]" /> Open 24 hours</label>
        {!f.is24 ? (
          <div className="grid grid-cols-2 gap-3">
            <Field id="open" label="Opens at"><input id="open" type="time" className={inputCls} value={f.openTime} onChange={(e) => setF({ ...f, openTime: e.target.value })} /></Field>
            <Field id="close" label="Closes at"><input id="close" type="time" className={inputCls} value={f.closeTime === "24:00" ? "23:59" : f.closeTime} onChange={(e) => setF({ ...f, closeTime: e.target.value })} /></Field>
          </div>
        ) : null}
      </fieldset>

      {[["prepMinutes", "Preparation time", "minutes to pack a typical order", 2, 90], ["maxActiveOrders", "Order capacity", "orders being packed at once before new orders pause", 1, 200]].map(([k, label, hint, min, max]) => (
        <div key={k as string} className="rounded-[22px] bg-white p-4 shadow-[0_4px_18px_-10px_rgba(0,0,0,.25)]">
          <p className="font-semibold" id={`${k}-l`}>{label as string}</p>
          <p className="mb-2 text-xs text-ink-2">{f[k as string]} {hint as string}</p>
          <div className="flex h-12 w-fit items-stretch overflow-hidden rounded-xl border-2 border-brand" role="group" aria-labelledby={`${k}-l`}>
            <button className="grid w-12 place-items-center text-brand hover:bg-mint" onClick={() => step(k as string, -1, min as number, max as number)} aria-label={`Decrease ${label}`}><IconMinus /></button>
            <output className="grid w-16 place-items-center text-lg font-bold">{f[k as string]}</output>
            <button className="grid w-12 place-items-center text-brand hover:bg-mint" onClick={() => step(k as string, 1, min as number, max as number)} aria-label={`Increase ${label}`}><IconPlus /></button>
          </div>
        </div>
      ))}
      {err ? <ErrorBox message={err} /> : null}
      {msg ? <Notice>{msg}</Notice> : null}
      <Button size="lg" className="w-full" onClick={save} busy={busy}>Save settings</Button>
    </div>
  );
}
