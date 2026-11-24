"use client";
import { useEffect, useState } from "react";
import { api, ApiErr } from "@/lib/client/api";
import type { StoreSummary } from "@/lib/types";
import type { LatLng } from "@/lib/geo";

/** Stores for a delivery point, as computed by the server (distance, eligibility, ETA, fee). */
export function useNearbyStores(point: LatLng | null | undefined) {
  const [stores, setStores] = useState<StoreSummary[] | null>(null);
  const [error, setError] = useState<ApiErr | null>(null);
  const [tick, setTick] = useState(0);
  const key = point ? `${point.lat.toFixed(6)},${point.lng.toFixed(6)}` : "";
  useEffect(() => {
    if (!point) return;
    let alive = true;
    setError(null);
    api<{ stores: StoreSummary[] }>("/stores/nearby", { method: "POST", json: { lat: point.lat, lng: point.lng } })
      .then((r) => alive && setStores(r.stores))
      .catch((e) => alive && setError(e));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  return { stores, error, retry: () => setTick((t) => t + 1) };
}
