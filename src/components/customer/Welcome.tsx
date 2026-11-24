import Link from "next/link";
import { RouteMotif } from "../RouteMotif";
import { Logo } from "../Logo";
import { IconKeyboard, IconLocate } from "../icons";

export function Welcome() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <Logo />
        <Link href="/demo" className="inline-flex min-h-10 items-center rounded-xl border border-dashed border-brand px-3 text-xs font-semibold uppercase tracking-wide text-brand">Demo switcher</Link>
      </div>
      <section className="mt-8 rounded-[2rem] bg-gradient-to-b from-hero via-hero-2 to-white px-4 pb-6 pt-8">
        <RouteMotif className="mx-auto w-full max-w-sm" progress={0.5} />
        <h1 className="mt-4 text-center text-[26px] font-bold leading-tight">Groceries from your neighbourhood supermarket</h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-[15px] text-ink-2">We only show stores within 3 km of you, with their own prices and stock. Track your order from shelf to doorstep.</p>
      </section>
      <section className="mt-6" aria-labelledby="where">
        <h2 id="where" className="mb-3 text-base font-semibold">Where should we deliver?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/address?mode=gps" className="flex min-h-20 items-center gap-3 rounded-2xl border-2 border-brand bg-white p-4 font-semibold text-ink hover:bg-mint">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white"><IconLocate /></span>
            <span>Use my current location<span className="block text-xs font-normal text-ink-2">We’ll ask your browser for permission</span></span>
          </Link>
          <Link href="/address?mode=manual" className="flex min-h-20 items-center gap-3 rounded-2xl border-2 border-brand bg-white p-4 font-semibold text-ink hover:bg-mint">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white"><IconKeyboard /></span>
            <span>Enter address manually<span className="block text-xs font-normal text-ink-2">Search your area or pincode</span></span>
          </Link>
        </div>
      </section>
      <p className="mt-auto pt-8 text-center text-xs text-ink-2">Demo website with fictional stores. No real orders are placed.</p>
    </main>
  );
}
