"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiErr } from "./api";

/** Fetch + optional polling. Keeps last good data when a refresh fails. */
export function useApi<T>(path: string | null, opts: { pollMs?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiErr | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const alive = useRef(true);
  const load = useCallback(async () => {
    if (!path) return;
    try {
      const d = await api<T>(path);
      if (!alive.current) return;
      setData(d); setError(null); setLastOkAt(Date.now());
    } catch (e) {
      if (alive.current) setError(e as ApiErr);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    alive.current = true;
    setLoading(!!path);
    load();
    if (!opts.pollMs) return () => { alive.current = false; };
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, opts.pollMs);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", load);
    return () => { alive.current = false; clearInterval(t); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("online", load); };
  }, [load, opts.pollMs]);
  return { data, error, loading, reload: load, setData, lastOkAt };
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export function useNow(ms = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
