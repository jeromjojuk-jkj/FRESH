"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { IconSearch, IconX } from "../icons";

export function SearchBox({ storeId, initial = "", autoFocus }: { storeId: string; initial?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [sugs, setSugs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) { setSugs([]); return; }
    timer.current = setTimeout(() => {
      api<{ suggestions: string[] }>(`/stores/${storeId}/suggest?q=${encodeURIComponent(q)}`).then((r) => setSugs(r.suggestions)).catch(() => setSugs([]));
    }, 180);
  }, [q, storeId]);

  const go = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); go(active >= 0 ? sugs[active] : q); }} className="relative">
      <label htmlFor="q" className="sr-only">Search products in this store</label>
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />
      <input
        id="q" type="search" value={q} autoFocus={autoFocus} autoComplete="off" enterKeyHint="search"
        placeholder="Search milk, rice or tomatoes"
        role="combobox" aria-expanded={open && sugs.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(sugs.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
          if (e.key === "Escape") setOpen(false);
        }}
        className="h-14 w-full rounded-2xl border-2 border-line bg-white pl-12 pr-12 text-base text-ink shadow-[0_4px_18px_-12px_rgba(23,99,58,.5)] placeholder:text-[#5B6B60] focus:border-brand focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {q ? (
        <button type="button" onClick={() => { setQ(""); setSugs([]); }} className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-mint" aria-label="Clear search"><IconX /></button>
      ) : null}
      {open && sugs.length > 0 ? (
        <ul id={listId} role="listbox" className="fade-in absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          {sugs.map((s, i) => (
            <li key={s} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(s)} className={`flex min-h-12 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-mint ${i === active ? "bg-mint" : ""}`}>
                <IconSearch className="h-4 w-4 text-ink-2" /> {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
