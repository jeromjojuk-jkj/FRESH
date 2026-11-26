"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { useApi } from "@/lib/client/hooks";
import { IconBox, IconList, IconSettings, IconStore, IconUpload } from "../icons";
import { Button, DemoTag, ErrorBox, Skeleton } from "../ui";

type Me = { role: string; id: string; name: string };

export function StoreShell({ children }: { children: React.ReactNode }) {
  const me = useApi<Me>("/me");
  const counts = useApi<{ counts: { new: number; active: number } }>(me.data?.role === "store" ? "/store/orders?view=new" : null, { pollMs: 5000 });
  const settings = useApi<{ settings: any }>(me.data?.role === "store" ? "/store/settings" : null, { pollMs: 30000 });
  const path = usePathname();
  const newCount = counts.data?.counts.new ?? 0;
  const prev = useRef(newCount);

  useEffect(() => {
    document.title = newCount ? `(${newCount}) New orders · KripFresh Store` : "KripFresh Store";
    if (newCount > prev.current && "vibrate" in navigator) navigator.vibrate?.(200);
    prev.current = newCount;
  }, [newCount]);

  if (me.error) return <div className="p-4"><ErrorBox message={me.error.message} onRetry={me.reload} /></div>;
  if (!me.data) return <div className="space-y-3 p-4"><Skeleton className="h-16" /><Skeleton className="h-40" /></div>;
  if (me.data.role !== "store") return <StoreSignIn />;

  const s = settings.data?.settings;
  const nav = [
    { href: "/store", label: "Orders", icon: IconList, badge: newCount, match: (p: string) => p === "/store" || p.startsWith("/store/orders") },
    { href: "/store/stock", label: "Stock & prices", icon: IconBox, match: (p: string) => p.startsWith("/store/stock") },
    { href: "/store/import", label: "Import", icon: IconUpload, match: (p: string) => p.startsWith("/store/import") },
    { href: "/store/settings", label: "Settings", icon: IconSettings, match: (p: string) => p.startsWith("/store/settings") },
  ];
  const active = counts.data?.counts.active ?? 0;
  const side = nav.filter((n) => n.href !== "/store");
  const ordersOn = nav[0].match(path);
  return (
    <div className="min-h-dvh bg-white pb-28 md:pb-6">
      <header className="bg-gradient-to-b from-head via-head-2 to-white">
        <div className="mx-auto max-w-5xl space-y-3 px-4 pb-2 pt-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white text-brand shadow-[var(--shadow-soft)]"><IconStore /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-2">Store dashboard</p>
              <p className="truncate text-base font-bold">{me.data.name}</p>
            </div>
            {s ? <AcceptToggle on={s.acceptingOrders} open={s.openNow} onChange={settings.reload} /> : null}
          </div>
          <dl className="grid grid-cols-3 gap-2">
            {[["New", String(newCount)], ["In progress", String(active)], ["Prep time", s ? `${s.prepMinutes} min` : "–"]].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-2xl bg-white px-3 py-2.5 shadow-[0_4px_14px_-10px_rgba(0,0,0,.25)]">
                <dd className="text-xl font-extrabold leading-tight">{v}</dd><dt className="text-xs text-ink-2">{k}</dt>
              </div>
            ))}
          </dl>
          <nav className="hidden gap-2 md:flex" aria-label="Store sections">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} aria-current={n.match(path) ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-semibold ${n.match(path) ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"}`}>
                <n.icon className="h-5 w-5" /> {n.label}{n.badge ? <span className="rounded-full bg-white px-2 text-xs text-brand">{n.badge} new</span> : null}
              </Link>
            ))}
            <Link href="/demo" className="ml-auto inline-flex min-h-11 items-center rounded-full border border-dashed border-brand bg-white px-4 text-xs font-semibold uppercase text-brand">Demo switcher</Link>
          </nav>
        </div>
      </header>
      {s && !s.acceptingOrders ? <p className="mx-4 mt-2 rounded-2xl bg-warn-bg px-4 py-2 text-center text-sm font-semibold text-warn">Paused — customers can’t place new orders with you.</p> : null}
      {s && s.acceptingOrders && !s.openNow ? <p className="mx-4 mt-2 rounded-2xl bg-warn-bg px-4 py-2 text-center text-sm font-semibold text-warn">Closed now ({s.hoursLabel}) — customers can’t order.</p> : null}
      <main id="main" className="mx-auto max-w-5xl px-4 pt-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden" aria-label="Store sections">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
          {side.slice(0, 2).map((n) => <SideLink key={n.href} n={n} on={n.match(path)} />)}
          <Link href="/store" aria-current={ordersOn ? "page" : undefined} className="flex flex-col items-center text-[11.5px] font-bold text-brand">
            <span className="relative grid h-16 w-16 -translate-y-4 place-items-center rounded-[22px] bg-brand text-white shadow-[0_0_0_6px_#fff,0_10px_20px_-8px_rgba(0,0,0,.35)]">
              <IconList className="h-7 w-7" />
              {newCount ? <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-heart px-1.5 text-center text-[11px] leading-5 text-white">{newCount}</span> : null}
            </span>
            <span className="-mt-3 pb-1">Orders</span>
          </Link>
          {side.slice(2).map((n) => <SideLink key={n.href} n={n} on={n.match(path)} />)}
          <Link href="/demo" className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium text-ink-2">
            <span className="grid h-6 place-items-center rounded-md border border-dashed border-brand px-1 text-[9px] font-bold uppercase text-brand">Demo</span>Switch
          </Link>
        </div>
      </nav>
    </div>
  );
}

function SideLink({ n, on }: { n: { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode }; on: boolean }) {
  return (
    <Link href={n.href} aria-current={on ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11.5px] ${on ? "font-bold text-brand" : "font-medium text-ink-2"}`}>
      <n.icon className="h-6 w-6" />{n.label.split(" ")[0]}
    </Link>
  );
}

function AcceptToggle({ on, onChange }: { on: boolean; open: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button role="switch" aria-checked={on} disabled={busy}
      onClick={async () => { setBusy(true); try { await api("/store/settings", { method: "PATCH", json: { acceptingOrders: !on } }); onChange(); } finally { setBusy(false); } }}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full pl-2 pr-3.5 text-[13px] font-bold ${on ? "bg-brand text-white" : "bg-warn-bg text-warn"}`}>
      <span className={`relative h-5 w-9 rounded-full ${on ? "bg-white/35" : "bg-[#E3C77A]"}`} aria-hidden><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} /></span>
      {on ? "Accepting" : "Paused"}
    </button>
  );
}

function StoreSignIn() {
  const accounts = useApi<{ stores: { id: string; name: string; area: string }[] }>("/demo/accounts");
  const router = useRouter();
  return (
    <main id="main" className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Store dashboard</h1>
      <p className="text-sm text-ink-2">Choose a supermarket account to continue. Each account sees only its own products and orders.</p>
      <div className="flex items-center gap-2"><DemoTag>Demo sign-in</DemoTag></div>
      {(accounts.data?.stores ?? []).map((s) => (
        <Button key={s.id} variant="secondary" className="w-full justify-start" onClick={async () => { await api("/demo/session", { method: "POST", json: { role: "store", id: s.id } }); router.refresh(); location.reload(); }}>
          <IconStore /> {s.name} <span className="font-normal text-ink-2">· {s.area}</span>
        </Button>
      ))}
    </main>
  );
}
