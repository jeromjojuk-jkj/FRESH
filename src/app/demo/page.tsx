"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { useApi } from "@/lib/client/hooks";
import { cart, setup } from "@/lib/client/store";
import { SAMPLE_ADDRESSES } from "@/lib/demo-data";
import { Logo } from "@/components/Logo";
import { Button, ErrorBox, Notice, Sheet } from "@/components/ui";
import { IconBag, IconScooter, IconStore } from "@/components/icons";

/** Clearly-labelled demo switcher for trying the three experiences. Not part of the real product. */
export default function DemoPage() {
  const acc = useApi<{ customers: any[]; stores: any[]; riders: any[] }>("/demo/accounts");
  const me = useApi<{ role: string; id: string; name: string }>("/me");
  const [err, setErr] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const go = async (role: string, id: string, to: string) => {
    setBusy(role + id); setErr(null);
    try { await api("/demo/session", { method: "POST", json: { role, id } }); window.location.href = to; }
    catch (e: any) { setErr(e.message); setBusy(null); }
  };
  const freshGuest = async () => {
    // Forget this browser's address, cart and session; the server creates a new guest on the next visit.
    await api("/demo/session", { method: "POST", json: { role: "guest" } }).catch(() => {});
    setup.set(() => ({ address: null, storeId: null, storeName: null, hydrated: true }));
    cart.set(() => ({ storeId: null, items: {}, updatedAt: Date.now() }));
    window.location.href = "/";
  };
  const reset = async () => {
    setBusy("reset");
    try {
      await api("/demo/reset", { method: "POST" });
      setup.set(() => ({ address: null, storeId: null, storeName: null, hydrated: true }));
      cart.set(() => ({ storeId: null, items: {}, updatedAt: Date.now() }));
      window.location.href = "/demo";
    } catch (e: any) { setErr(e.message); setBusy(null); }
  };

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between"><Logo /><span className="rounded-full border-2 border-dashed border-brand px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">Demo switcher</span></div>
      <Notice tone="warn"><strong>Demo mode.</strong> All stores, people, prices and payments here are fictional. Switch roles to follow one order from checkout to doorstep — open each role in its own browser tab or device to watch updates appear live.</Notice>
      {me.data ? <p className="text-sm">Currently signed in as <strong>{me.data.name}</strong> ({me.data.role}).</p> : null}
      {err ? <ErrorBox message={err} /> : null}

      <section aria-labelledby="c-h" className="space-y-2">
        <h2 id="c-h" className="flex items-center gap-2 text-lg font-semibold"><IconBag /> Customer</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(acc.data?.customers ?? []).map((c) => (
            <Button key={c.id} variant="secondary" busy={busy === "customer" + c.id} onClick={() => go("customer", c.id, "/")} className="h-auto flex-col items-start py-3 text-left">
              {c.name}<span className="text-xs font-normal text-ink-2">{c.id === "cust-asha" ? "Returning — has “Buy again”" : "Registered customer"}</span>
            </Button>
          ))}
          <Button variant="secondary" onClick={freshGuest} className="h-auto flex-col items-start py-3 text-left">New visitor<span className="text-xs font-normal text-ink-2">Starts at the welcome screen</span></Button>
        </div>
        <details className="rounded-2xl bg-mint p-3 text-sm">
          <summary className="min-h-10 cursor-pointer py-2 font-semibold">Sample delivery addresses</summary>
          <ul className="mt-1 space-y-1">{SAMPLE_ADDRESSES.map((a) => <li key={a.id}><strong>{a.title}</strong> — {a.note}</li>)}</ul>
          <p className="mt-2 text-ink-2">Pick them on the address screen under “Sample addresses”. GPS works too, but real locations will be outside the demo area.</p>
        </details>
      </section>

      <section aria-labelledby="s-h" className="space-y-2">
        <h2 id="s-h" className="flex items-center gap-2 text-lg font-semibold"><IconStore /> Supermarket staff</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(acc.data?.stores ?? []).map((s) => (
            <Button key={s.id} variant="secondary" busy={busy === "store" + s.id} onClick={() => go("store", s.id, "/store")} className="h-auto flex-col items-start py-3 text-left">
              {s.name}<span className="text-xs font-normal text-ink-2">{s.area}</span>
            </Button>
          ))}
        </div>
      </section>

      <section aria-labelledby="r-h" className="space-y-2">
        <h2 id="r-h" className="flex items-center gap-2 text-lg font-semibold"><IconScooter /> Delivery partner</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(acc.data?.riders ?? []).map((r) => (
            <Button key={r.id} variant="secondary" busy={busy === "rider" + r.id} onClick={() => go("rider", r.id, "/rider")} className="h-auto flex-col items-start py-3 text-left">
              {r.name}<span className="text-xs font-normal text-ink-2">Usually at {r.store}</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-ink-2">Orders are assigned when a store accepts them, preferring that store’s own rider.</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-line p-4 text-sm">
        <h2 className="font-semibold">Try the full journey</h2>
        <ol className="list-inside list-decimal space-y-1 text-ink-2">
          <li>As a customer, pick “Koramangala 1st Block”, add groceries and place an order.</li>
          <li>Switch to <strong className="text-ink">Greenleaf Fresh Mart</strong> (or the store you chose): Accept → Start packing → Mark ready.</li>
          <li>Switch to that store’s rider: Confirm pickup → Simulate ride → Confirm delivery.</li>
          <li>Back as the customer, open Orders to see each step.</li>
        </ol>
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-brand underline">Go to the storefront</Link>
      </section>

      <Button variant="danger" onClick={() => setConfirmReset(true)}>Reset all demo data</Button>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?"
        footer={<><Button variant="danger" busy={busy === "reset"} onClick={reset}>Yes, reset everything</Button><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button></>}>
        <p className="text-sm">This restores the three demo stores, products, prices and stock, and removes all orders placed in the demo.</p>
      </Sheet>
    </main>
  );
}
