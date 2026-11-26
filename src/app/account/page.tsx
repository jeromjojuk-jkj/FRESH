"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useApi } from "@/lib/client/hooks";
import { setup } from "@/lib/client/store";
import { rupees } from "@/lib/money";
import { CustomerHeader } from "@/components/customer/Shell";
import { BottomNav } from "@/components/customer/BottomNav";
import { Button, ErrorBox, Field, Notice, Sheet, Skeleton, inputCls } from "@/components/ui";
import { IconChevron, IconList, IconPin } from "@/components/icons";

type Account = { id: string; name: string; phone: string; plus: { active: boolean; until: string | null; autoRenew: boolean; price: number }; orders: number };
type Coupon = { code: string; title: string; description: string; plusOnly: boolean; firstOrderOnly: boolean };

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function AccountPage() {
  const acc = useApi<{ account: Account }>("/me/account");
  const coupons = useApi<{ coupons: Coupon[] }>("/coupons");
  const s = setup.use();
  const [edit, setEdit] = useState(false);
  const [plusSheet, setPlusSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const a = acc.data?.account;
  useEffect(() => { if (a) setForm({ name: a.name === "Guest" ? "" : a.name, phone: a.phone }); }, [a?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const plus = async (action: string, done: string) => {
    setBusy(true); setErr(null);
    try { const r = await api<{ account: Account }>("/me/plus", { method: "POST", json: { action } }); acc.setData(r); setMsg(done); setPlusSheet(false); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setErr(null);
    try { const r = await api<{ account: Account }>("/me/account", { method: "PATCH", json: form }); acc.setData(r); setEdit(false); setMsg("Profile saved."); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <CustomerHeader back="/" title="Account" />
      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 pb-32 pt-4 lg:pb-12">
        {acc.error ? <ErrorBox message={acc.error.message} onRetry={acc.reload} /> : !a ? <Skeleton className="h-40" /> : (
          <>
            <section className="flex items-center gap-4 rounded-[24px] bg-gradient-to-br from-head to-white p-5">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand text-2xl font-bold text-white">{(a.name === "Guest" ? "G" : a.name[0]).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold">{a.name === "Guest" ? "Hello there" : a.name}</h1>
                <p className="text-sm text-ink-2">{a.phone || "Add your mobile number"} · {a.orders} order{a.orders === 1 ? "" : "s"}</p>
              </div>
              <Button variant="secondary" className="!min-h-10 !rounded-xl px-3 text-sm" onClick={() => { setEdit(true); setErr(null); }}>Edit</Button>
            </section>
            {msg ? <Notice>{msg}</Notice> : null}

            <section aria-labelledby="plus-h" className={`overflow-hidden rounded-[24px] p-5 ${a.plus.active ? "bg-[#0E1A13] text-white" : "border-2 border-dashed border-brand"}`}>
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-brand px-2 py-1 text-xs font-extrabold text-white">PLUS</span>
                <div className="min-w-0 flex-1">
                  <h2 id="plus-h" className="text-lg font-bold">KripFresh Plus</h2>
                  {a.plus.active ? (
                    <p className="text-sm text-white/75">{a.plus.autoRenew ? `Renews on ${fmtDate(a.plus.until!)}` : `Ends on ${fmtDate(a.plus.until!)} · won’t renew`}</p>
                  ) : <p className="text-sm text-ink-2">{rupees(a.plus.price)} a month. Payment is simulated in this demo.</p>}
                </div>
              </div>
              <ul className={`mt-3 grid gap-1.5 text-sm sm:grid-cols-3 ${a.plus.active ? "text-white/90" : ""}`}>
                <li>✓ Free delivery above ₹99</li><li>✓ No small-cart fee</li><li>✓ Members-only coupon PLUS20</li>
              </ul>
              <div className="mt-4">
                {a.plus.active
                  ? (a.plus.autoRenew
                    ? <button type="button" onClick={() => setPlusSheet(true)} className="min-h-11 text-sm font-semibold text-white/80 underline">Cancel membership</button>
                    : <Button onClick={() => plus("resume", "Plus will renew automatically.")} busy={busy}>Turn renewal back on</Button>)
                  : <Button onClick={() => plus("join", "Welcome to KripFresh Plus! Benefits apply to your next order.")} busy={busy}>Join for {rupees(a.plus.price)}/month</Button>}
              </div>
            </section>

            <nav aria-label="Your account" className="overflow-hidden rounded-[24px] border border-line">
              {[
                ["/orders", "Your orders", "Track, cancel, rate or reorder", <IconList key="i" className="h-5 w-5" />],
                ["/address", "Delivery address", s.address ? [s.address.flat, s.address.line].filter(Boolean).join(", ") : "Add an address", <IconPin key="i" className="h-5 w-5" />],
                ["/help", "Help & support", "FAQs and your support requests", <span key="i" className="text-lg font-bold">?</span>],
              ].map(([href, t, d, icon]) => (
                <Link key={href as string} href={href as string} className="flex min-h-16 items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-tile">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-brand">{icon}</span>
                  <span className="min-w-0 flex-1"><b className="block text-[15px]">{t}</b><span className="block truncate text-sm text-ink-2">{d}</span></span>
                  <IconChevron className="h-5 w-5 text-ink-2" />
                </Link>
              ))}
            </nav>

            <section aria-labelledby="cp-h" className="space-y-3">
              <h2 id="cp-h" className="text-lg font-bold">Coupons for you</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {(coupons.data?.coupons ?? []).map((c) => (
                  <li key={c.code} className="rounded-2xl border-2 border-dashed border-brand/60 p-4">
                    <span className="rounded-lg bg-mint px-2 py-1 font-mono text-sm font-bold text-brand">{c.code}</span>
                    <p className="mt-2 font-semibold">{c.title}</p>
                    <p className="text-sm text-ink-2">{c.description}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-2">Apply a coupon from your cart. One coupon per order.</p>
            </section>

            <section aria-labelledby="legal-h" className="rounded-[24px] bg-tile p-4 text-sm">
              <h2 id="legal-h" className="mb-2 font-bold">Policies</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {[["terms", "Terms of use"], ["privacy", "Privacy policy"], ["refunds", "Refunds & cancellation"], ["delivery", "Delivery policy"], ["grievance", "Grievance officer"]].map(([k, l]) => (
                  <Link key={k} href={`/legal/${k}`} className="font-semibold text-brand hover:underline">{l}</Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <BottomNav />

      <Sheet open={edit} onClose={() => setEdit(false)} title="Edit profile" footer={<Button onClick={save} busy={busy}>Save</Button>}>
        <div className="space-y-3">
          <Field id="acc-name" label="Name"><input id="acc-name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></Field>
          <Field id="acc-phone" label="Mobile number" hint="Your rider calls this number if needed."><input id="acc-phone" type="tel" inputMode="tel" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></Field>
          {err ? <ErrorBox compact message={err} /> : null}
        </div>
      </Sheet>
      <Sheet open={plusSheet} onClose={() => setPlusSheet(false)} title="Cancel KripFresh Plus?"
        footer={<><Button variant="danger" onClick={() => plus("cancel", "Plus won’t renew. Your benefits continue until the end of this period.")} busy={busy}>Cancel membership</Button><Button variant="ghost" onClick={() => setPlusSheet(false)}>Keep Plus</Button></>}>
        <p className="text-sm">Your membership won’t renew. You keep free delivery and no small-cart fee until {a?.plus.until ? fmtDate(a.plus.until) : "the end of this period"}. You won’t be charged again.</p>
      </Sheet>
    </>
  );
}
