"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { IconMic, IconSearch, IconX } from "../icons";

type Recognition = { lang: string; interimResults: boolean; onresult: (e: any) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };

export function SearchBox({ storeId, initial = "", autoFocus, compact }: { storeId: string; initial?: string; autoFocus?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [sugs, setSugs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [voice, setVoice] = useState<"off" | "ready" | "listening">("off");
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rec = useRef<Recognition | null>(null);

  // Voice search only where the browser supports it; otherwise the button isn't shown.
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setVoice("ready");
  }, []);

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

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (voice === "listening") { rec.current?.stop(); return; }
    const r: Recognition = new SR();
    r.lang = "en-IN";
    r.interimResults = false;
    r.onresult = (e) => { const said = e.results?.[0]?.[0]?.transcript ?? ""; setQ(said); go(said); };
    r.onend = () => setVoice("ready");
    r.onerror = () => setVoice("ready");
    rec.current = r;
    setVoice("listening");
    r.start();
  };

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); go(active >= 0 ? sugs[active] : q); }} className="relative">
      <label htmlFor={compact ? "q-top" : "q"} className="sr-only">Search products in this store</label>
      <IconSearch className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" />
      <input
        id={compact ? "q-top" : "q"} type="search" value={q} autoFocus={autoFocus} autoComplete="off" enterKeyHint="search"
        placeholder={voice === "listening" ? "Listening…" : "Search “tomato”, “அரிசி”…"}
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
        className={`w-full border-0 bg-white pl-[52px] pr-28 text-base text-ink ${compact ? "h-12 rounded-xl bg-tile" : "h-[60px] rounded-[18px] shadow-[0_6px_20px_-12px_rgba(0,0,0,.25)]"} placeholder:text-[#5E6368] focus:outline-none focus:ring-2 focus:ring-brand/40 [&::-webkit-search-cancel-button]:hidden`}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {q ? (
          <button type="button" onClick={() => { setQ(""); setSugs([]); }} className="grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-mint" aria-label="Clear search"><IconX /></button>
        ) : null}
        {voice !== "off" && !q ? (
          <button type="button" onClick={listen} aria-pressed={voice === "listening"} aria-label={voice === "listening" ? "Stop voice search" : "Search by voice"}
            className={`grid h-11 w-11 place-items-center rounded-xl ${voice === "listening" ? "bg-heart text-white" : "text-ink-2 hover:bg-mint"}`}><IconMic /></button>
        ) : null}
        <button type="submit" aria-label="Search" className="grid h-10 w-10 place-items-center rounded-[14px] bg-mint text-brand hover:bg-fresh"><IconSearch /></button>
      </div>
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
