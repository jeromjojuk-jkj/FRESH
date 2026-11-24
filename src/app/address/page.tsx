"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client/api";
import { setup } from "@/lib/client/store";
import { useHydrated } from "@/lib/client/hooks";
import { SAMPLE_ADDRESSES } from "@/lib/demo-data";
import type { DeliveryAddress } from "@/lib/types";
import type { LatLng } from "@/lib/geo";
import { CustomerHeader } from "@/components/customer/Shell";
import { Button, DemoTag, ErrorBox, Field, Notice, inputCls } from "@/components/ui";
import { IconKeyboard, IconLocate, IconPin, IconSearch } from "@/components/icons";

const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-mint" /> });

type GeoResult = { line: string; lat: number; lng: number; provider: string; approximate: boolean };
type Step = "choose" | "locating" | "manual" | "confirm";

export default function AddressPage() {
  return <Suspense><AddressFlow /></Suspense>;
}

function AddressFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const current = setup.use().address;
  const mode = params.get("mode");
  const [step, setStep] = useState<Step>("choose");
  const [gpsNote, setGpsNote] = useState<{ tone: "warn" | "info"; text: string } | null>(null);
  const [draft, setDraft] = useState<DeliveryAddress | null>(null);
  const started = useRef(false);

  const locate = useCallback(() => {
    setGpsNote(null);
    if (!("geolocation" in navigator)) {
      setGpsNote({ tone: "warn", text: "This browser can’t share your location. Please enter your address instead." });
      setStep("manual");
      return;
    }
    setStep("locating");
    // Permission is requested only now, after the customer chose this option.
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const acc = Math.round(pos.coords.accuracy);
        let line = "";
        try { line = (await api<{ result: GeoResult | null }>(`/geo/reverse?lat=${p.lat}&lng=${p.lng}`)).result?.line ?? ""; } catch {}
        setDraft({ ...p, line, flat: "", floor: "", landmark: "", instructions: "", label: "Home" });
        if (acc > 150) setGpsNote({ tone: "warn", text: `Your location is approximate (within about ${acc >= 1000 ? (acc / 1000).toFixed(1) + " km" : acc + " m"}). Drag the pin to your building, or enter the address manually.` });
        setStep("confirm");
      },
      (err) => {
        setGpsNote({
          tone: "warn",
          text: err.code === err.PERMISSION_DENIED
            ? "Location permission is off. No problem — enter your address below."
            : "We couldn’t find your location. Please enter your address below.",
        });
        setStep("manual");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    if (mode === "gps") locate();
    else if (mode === "manual") setStep("manual");
    else if (current) { setDraft(current); setStep("confirm"); }
  }, [hydrated, mode, locate, current]);

  const save = (a: DeliveryAddress) => {
    setup.set((s) => ({ ...s, address: a }));
    // Re-check stores for the new address; the store page explains any cart impact.
    router.push("/stores?auto=1&from=address");
  };

  return (
    <>
      <CustomerHeader back={current ? "/" : "/"} title={step === "confirm" ? "Confirm delivery address" : "Delivery address"} />
      <main id="main" className="mx-auto max-w-xl px-4 pb-10 pt-4">
        {gpsNote ? <div className="mb-4" role="status"><Notice tone={gpsNote.tone}>{gpsNote.text}</Notice></div> : null}
        {step === "choose" ? (
          <div className="grid gap-3">
            <button onClick={locate} className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-brand p-4 text-left font-semibold hover:bg-mint">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><IconLocate /></span> Use my current location
            </button>
            <button onClick={() => setStep("manual")} className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-brand p-4 text-left font-semibold hover:bg-mint">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><IconKeyboard /></span> Enter address manually
            </button>
          </div>
        ) : null}
        {step === "locating" ? (
          <div className="grid place-items-center gap-3 rounded-[var(--radius-card)] bg-mint p-10 text-center" role="status">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" aria-hidden />
            <p className="font-semibold">Finding your location…</p>
            <p className="text-sm text-ink-2">If your browser asks, choose “Allow”.</p>
            <Button variant="ghost" onClick={() => setStep("manual")}>Enter address manually instead</Button>
          </div>
        ) : null}
        {step === "manual" ? <ManualSearch onPick={(r) => { setDraft({ lat: r.lat, lng: r.lng, line: r.line, flat: "", floor: "", landmark: "", instructions: "", label: "Home" }); setStep("confirm"); }} onGps={locate} /> : null}
        {step === "confirm" && draft ? <ConfirmForm draft={draft} onChange={setDraft} onSave={save} onSearchAgain={() => setStep("manual")} /> : null}
      </main>
    </>
  );
}

function ManualSearch({ onPick, onGps }: { onPick: (r: GeoResult) => void; onGps: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true); setErr(null);
    try { setResults((await api<{ results: GeoResult[] }>(`/geo/search?q=${encodeURIComponent(q)}`)).results); }
    catch (x: any) { setErr(x.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <form onSubmit={search} className="space-y-2">
        <Field id="area" label="Area, street or pincode">
          <div className="flex gap-2">
            <input id="area" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Koramangala or 560034" autoComplete="street-address" />
            <Button type="submit" busy={busy} aria-label="Search address"><IconSearch /> <span className="hidden sm:inline">Search</span></Button>
          </div>
        </Field>
        {err ? <ErrorBox message={err} onRetry={() => search()} compact /> : null}
        {results && results.length === 0 ? <Notice>No places found. Try a nearby locality name or pincode, or pick a sample address below.</Notice> : null}
        {results && results.length > 0 ? (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {results.map((r) => (
              <li key={r.line + r.lat}>
                <button onClick={() => onPick(r)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-mint">
                  <IconPin className="h-5 w-5 shrink-0 text-brand" /> <span className="text-[15px]">{r.line}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      <section aria-labelledby="samples" className="rounded-[var(--radius-card)] border border-dashed border-brand p-4">
        <div className="mb-2 flex items-center gap-2"><h2 id="samples" className="text-sm font-semibold">Sample addresses</h2><DemoTag /></div>
        <ul className="grid gap-2">
          {SAMPLE_ADDRESSES.map((a) => (
            <li key={a.id}>
              <button onClick={() => onPick({ line: a.line, lat: a.lat, lng: a.lng, provider: "demo", approximate: false })} className="flex min-h-14 w-full items-start gap-3 rounded-xl bg-mint/70 px-3 py-2 text-left hover:bg-mint" data-testid={`sample-${a.id}`}>
                <IconPin className="mt-1 h-5 w-5 shrink-0 text-brand" />
                <span><span className="block text-sm font-semibold">{a.title}</span><span className="block text-xs text-ink-2">{a.note}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <Button variant="ghost" className="w-full" onClick={onGps}><IconLocate /> Try my current location again</Button>
    </div>
  );
}

function ConfirmForm({ draft, onChange, onSave, onSearchAgain }: { draft: DeliveryAddress; onChange: (a: DeliveryAddress) => void; onSave: (a: DeliveryAddress) => void; onSearchAgain: () => void }) {
  const [mapDown, setMapDown] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reverseBusy, setReverseBusy] = useState(false);
  const set = (k: keyof DeliveryAddress, v: string) => onChange({ ...draft, [k]: v });
  const movePin = async (p: LatLng) => {
    onChange({ ...draft, ...p });
    setReverseBusy(true);
    try {
      const r = await api<{ result: GeoResult | null }>(`/geo/reverse?lat=${p.lat}&lng=${p.lng}`);
      if (r.result?.line) onChange({ ...draft, ...p, line: r.result.line });
    } catch {} finally { setReverseBusy(false); }
  };
  const flatMissing = !draft.flat?.trim();
  const lineMissing = !draft.line?.trim();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!flatMissing && !lineMissing) onSave({ ...draft, line: draft.line.trim() }); }} noValidate>
      <MapView className="h-64" label="Map: drag the pin to your exact building" markers={[]} draggablePin={{ pos: draft, onMove: movePin }} onUnavailable={() => setMapDown(true)} />
      <p className="text-xs text-ink-2">{mapDown ? "The map isn’t available right now. Your address below is enough for delivery." : "Drag the pin to your exact building. We use this point to find stores within 3 km."}{reverseBusy ? " Updating address…" : ""}</p>

      <Field id="line" label="Street and area">
        <textarea id="line" rows={2} className={`${inputCls} py-2.5`} value={draft.line} onChange={(e) => set("line", e.target.value)} aria-invalid={touched && lineMissing} required />
      </Field>
      {touched && lineMissing ? <p className="text-sm font-medium text-danger">Please enter the street and area.</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field id="flat" label="Flat / house no. (required)">
          <input id="flat" className={inputCls} value={draft.flat ?? ""} onChange={(e) => set("flat", e.target.value)} autoComplete="address-line2" aria-invalid={touched && flatMissing} aria-describedby={touched && flatMissing ? "flat-err" : undefined} />
        </Field>
        <Field id="floor" label="Floor">
          <input id="floor" className={inputCls} value={draft.floor ?? ""} onChange={(e) => set("floor", e.target.value)} inputMode="text" />
        </Field>
      </div>
      {touched && flatMissing ? <p id="flat-err" className="text-sm font-medium text-danger">Please add your flat or house number so the rider can find you.</p> : null}
      <Field id="landmark" label="Landmark">
        <input id="landmark" className={inputCls} value={draft.landmark ?? ""} onChange={(e) => set("landmark", e.target.value)} placeholder="e.g. Opposite the park" />
      </Field>
      <Field id="instructions" label="Delivery instructions">
        <input id="instructions" className={inputCls} value={draft.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} placeholder="e.g. Ring the bell, don’t call" />
      </Field>
      <Field id="phone" label="Phone number for the rider (optional)">
        <input id="phone" type="tel" inputMode="tel" autoComplete="tel" className={inputCls} value={draft.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98xxx xxxxx" />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Save as</legend>
        <div className="flex gap-2">
          {["Home", "Work", "Other"].map((l) => (
            <label key={l} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-semibold ${draft.label === l ? "border-brand bg-fresh/60" : "border-line"}`}>
              <input type="radio" name="label" className="sr-only" checked={draft.label === l} onChange={() => set("label", l)} />{l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" size="lg">Confirm address</Button>
        <Button type="button" variant="ghost" onClick={onSearchAgain}>Search a different address</Button>
      </div>
    </form>
  );
}
