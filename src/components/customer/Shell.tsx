"use client";
import Link from "next/link";
import { setup } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { IconBack, IconEdit, IconList, IconPin } from "../icons";
import { Logo } from "../Logo";

export function CustomerHeader({ back, title }: { back?: string; title?: string }) {
  const s = setup.use();
  const hydrated = useHydrated();
  const a = hydrated ? s.address : null;
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        {back ? (
          <Link href={back} className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-mint" aria-label="Back"><IconBack /></Link>
        ) : (
          <Link href="/" className="hidden shrink-0 pr-2 md:block" aria-label="KripFresh home"><Logo /></Link>
        )}
        {title ? <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1> : (
          <Link href="/address" className="group flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 hover:bg-mint" aria-label={a ? `Deliver to ${a.flat ? a.flat + ", " : ""}${a.line}. Edit address` : "Set delivery address"}>
            <IconPin className="h-5 w-5 shrink-0 text-brand" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-ink-2">Deliver to{a?.label ? ` · ${a.label}` : ""}</span>
              <span className="block truncate text-sm font-semibold">{a ? `${a.flat ? a.flat + ", " : ""}${a.line}` : "Set your address"}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-semibold text-brand group-hover:underline"><IconEdit className="h-4 w-4" /> Edit</span>
          </Link>
        )}
        <Link href="/orders" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-brand hover:bg-mint">
          <IconList className="h-5 w-5" /> <span>Orders</span>
        </Link>
        <Link href="/demo" className="hidden min-h-11 shrink-0 items-center rounded-xl border border-dashed border-brand px-2.5 text-xs font-semibold uppercase tracking-wide text-brand hover:bg-mint sm:inline-flex">Demo switcher</Link>
      </div>
    </header>
  );
}

/** Small, clearly-labelled demo entry point on phones (the header link shows on wider screens). */
export function DemoFab({ raised }: { raised?: boolean }) {
  return (
    <Link href="/demo" className={`fixed left-3 z-20 inline-flex min-h-10 items-center rounded-full border border-dashed border-brand bg-white/95 px-3 text-[11px] font-semibold uppercase tracking-wide text-brand shadow-sm sm:hidden ${raised ? "bottom-24" : "bottom-3"}`}>
      Demo
    </Link>
  );
}
