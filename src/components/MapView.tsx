"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geo";

/**
 * Leaflet map. Tile source is configurable (NEXT_PUBLIC_MAP_TILE_URL) so a commercial
 * provider can be swapped in. If tiles or the library fail, `onUnavailable` fires and the
 * caller shows text instead — no flow depends on the map.
 */
type Marker = { id: string; pos: LatLng; kind: "store" | "rider" | "home"; label: string; muted?: boolean };
type Props = {
  markers: Marker[];
  route?: LatLng[];
  draggablePin?: { pos: LatLng; onMove: (p: LatLng) => void };
  className?: string;
  label: string;
  onUnavailable?: () => void;
};

const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

const pinHtml = (kind: Marker["kind"] | "drag", muted?: boolean) => {
  const color = muted ? "#7A8A80" : "#22B24C";
  if (kind === "rider") return `<div style="width:30px;height:30px;border-radius:50%;background:#D6F5DC;border:3px solid ${color};box-shadow:0 0 0 6px rgba(183,237,170,.45)"></div>`;
  if (kind === "store") return `<div style="width:30px;height:30px;border-radius:10px;background:${color};color:#fff;display:grid;place-items:center;font:600 13px Poppins">S</div>`;
  return `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s15-14 15-26A15 15 0 0 0 2 17c0 12 15 26 15 26Z" fill="${color}"/><circle cx="17" cy="17" r="6" fill="#fff"/></svg>`;
};

export function MapView({ markers, route, draggablePin, className = "", label, onUnavailable }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);
  const L = useRef<any>(null);
  const [failed, setFailed] = useState(false);
  const dragRef = useRef(draggablePin);
  dragRef.current = draggablePin;

  useEffect(() => {
    let cancelled = false;
    let tileErrors = 0, tileOk = 0;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current) return;
      L.current = mod.default ?? mod;
      const lf = L.current;
      map.current = lf.map(el.current, { zoomControl: true, attributionControl: true }).setView([12.93, 77.63], 14);
      const tiles = lf.tileLayer(TILE, { maxZoom: 19, attribution: ATTR });
      tiles.on("tileload", () => { tileOk++; });
      tiles.on("tileerror", () => {
        tileErrors++;
        if (tileErrors >= 4 && tileOk === 0) { setFailed(true); onUnavailable?.(); }
      });
      tiles.addTo(map.current);
      layer.current = lf.layerGroup().addTo(map.current);
      draw();
    }).catch(() => { setFailed(true); onUnavailable?.(); });
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    const lf = L.current, m = map.current, g = layer.current;
    if (!lf || !m || !g) return;
    g.clearLayers();
    const pts: [number, number][] = [];
    if (route && route.length > 1) {
      const line = route.map((p) => [p.lat, p.lng] as [number, number]);
      lf.polyline(line, { color: "#D6F5DC", weight: 7, opacity: 0.9 }).addTo(g);
      lf.polyline(line, { color: "#22B24C", weight: 2.5, dashArray: "6 8" }).addTo(g);
    }
    for (const mk of markers) {
      lf.marker([mk.pos.lat, mk.pos.lng], { icon: lf.divIcon({ className: "nb-pin", html: pinHtml(mk.kind, mk.muted), iconSize: mk.kind === "home" ? [34, 44] : [30, 30], iconAnchor: mk.kind === "home" ? [17, 43] : [15, 15] }), title: mk.label, alt: mk.label, keyboard: false })
        .bindTooltip(mk.label).addTo(g);
      pts.push([mk.pos.lat, mk.pos.lng]);
    }
    const dp = dragRef.current;
    if (dp) {
      const pin = lf.marker([dp.pos.lat, dp.pos.lng], { draggable: true, autoPan: true, title: "Delivery location — drag to adjust", alt: "Delivery location", icon: lf.divIcon({ className: "nb-pin", html: pinHtml("drag"), iconSize: [34, 44], iconAnchor: [17, 43] }) }).addTo(g);
      pin.on("dragend", () => { const ll = pin.getLatLng(); dragRef.current?.onMove({ lat: ll.lat, lng: ll.lng }); });
      pts.push([dp.pos.lat, dp.pos.lng]);
    }
    if (dp && pts.length === 1) m.setView(pts[0], 17, { animate: false });
    else if (pts.length === 1) m.setView(pts[0], 16, { animate: false });
    else if (pts.length > 1) m.fitBounds(pts, { padding: [36, 36], maxZoom: 16, animate: false });
  };

  const key = JSON.stringify([markers, route, draggablePin?.pos]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { draw(); }, [key]);

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] border border-line ${className}`}>
      <div ref={el} className="h-full w-full" role="application" aria-label={label} />
      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-mint p-4 text-center text-sm text-ink" role="status">
          <p><strong className="font-semibold">Map couldn’t load.</strong><br />Everything still works — use the details below.</p>
        </div>
      ) : null}
    </div>
  );
}
