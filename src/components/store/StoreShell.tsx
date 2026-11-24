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
    document.title = newCount ? `(${newCount}) New orders · NearBasket Store` : "NearBasket Store";
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
  return (
    <div className="min-h-dvh bg-white pb-24 md:pb-6">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white"><IconStore /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{me.data.name}</p>
            <p className="text-xs text-ink-2">Store dashboard</p>
          </div>
          {s ? <AcceptToggle on={s.acceptingOrders} open={s.openNow} onChange={settings.reload} /> : null}
          <Link href="/demo" className="hidden min-h-11 items-center rounded-xl border border-dashed border-brand px-2.5 text-xs font-semibold uppercase text-brand sm:inline-flex">Demo switcher</Link>
        </div>
        <nav className="mx-auto hidden max-w-5xl gap-1 px-4 pb-2 md:flex" aria-label="Store sections">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.match(path) ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${n.match(path) ? "bg-brand text-white" : "text-ink hover:bg-mint"}`}>
              <n.icon className="h-5 w-5" /> {n.label}{n.badge ? <span className="rounded-full bg-fresh px-2 text-xs text-ink">{n.badge} new</span> : null}
            </Link>
          ))}
        </nav>
      </header>
      {s && !s.acceptingOrders ? <p className="bg-warn-bg px-4 py-2 text-center text-sm font-semibold text-warn">Paused — customers can’t place new orders with you.</p> : null}
      {s && s.acceptingOrders && !s.openNow ? <p className="bg-warn-bg px-4 py-2 text-center text-sm font-semibold text-warn">Closed now ({s.hoursLabel}) — customers can’t order.</p> : null}
      <main id="main" className="mx-auto max-w-5xl px-4 pt-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Store sections">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={n.match(path) ? "page" : undefined} className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${n.match(path) ? "text-brand" : "text-ink-2"}`}>
            <n.icon className="h-6 w-6" />{n.label.split(" ")[0]}
            {n.badge ? <span className="absolute right-[22%] top-1.5 min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] text-white">{n.badge}</span> : null}
            {n.match(path) ? <span className="absolute inset-x-6 top-0 h-1 rounded-b bg-brand" aria-hidden /> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function AcceptToggle({ on, onChange }: { on: boolean; open: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button role="switch" aria-checked={on} disabled={busy}
      onClick={async () => { setBusy(true); try { await api("/store/settings", { method: "PATCH", json: { acceptingOrders: !on } }); onChange(); } finally { setBusy(false); } }}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-3 text-sm font-semibold ${on ? "border-brand bg-fresh text-ink" : "border-warn bg-warn-bg text-warn"}`}>
      <span className={`relative h-5 w-9 rounded-full ${on ? "bg-brand" : "bg-[#9aa79e]"}`} aria-hidden><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} /></span>
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
