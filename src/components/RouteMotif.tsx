// The NearBasket motif: a thin green route linking supermarket → rider → customer.
type Props = { progress?: number; animated?: boolean; labels?: boolean; className?: string; title?: string };

const P0 = { x: 40, y: 92 }, P1 = { x: 180, y: -10 }, P2 = { x: 320, y: 92 };
const at = (t: number) => ({
  x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * P1.x + t ** 2 * P2.x,
  y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * P1.y + t ** 2 * P2.y,
});

export function RouteMotif({ progress = 0.5, animated = true, labels = true, className = "", title = "Delivery route from supermarket to you" }: Props) {
  const t = Math.min(1, Math.max(0, progress));
  const r = at(t);
  const d = `M${P0.x} ${P0.y} Q${P1.x} ${P1.y} ${P2.x} ${P2.y}`;
  return (
    <svg viewBox="0 0 360 130" className={className} role="img" aria-label={title}>
      <path d={d} fill="none" stroke="#B7EDAA" strokeWidth="6" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#17633A" strokeWidth="2" strokeLinecap="round" className={animated ? "route-flow" : undefined} strokeDasharray={animated ? undefined : "0"} />
      {/* store */}
      <g transform={`translate(${P0.x - 20} ${P0.y - 20})`}>
        <rect width="40" height="40" rx="12" fill="#17633A" />
        <path d="M10 18v12h20V18M9 18l3-7h16l3 7a3.5 3.5 0 0 1-7 0 3.5 3.5 0 0 1-7 0 3.5 3.5 0 0 1-7 0Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </g>
      {/* customer */}
      <g transform={`translate(${P2.x - 20} ${P2.y - 20})`}>
        <rect width="40" height="40" rx="20" fill="#fff" stroke="#17633A" strokeWidth="2" />
        <path d="M12 21 20 14l8 7M14 20v8h12v-8" fill="none" stroke="#17633A" strokeWidth="2" strokeLinejoin="round" />
      </g>
      {/* rider */}
      <g transform={`translate(${r.x} ${r.y})`}>
        {animated ? <circle r="14" fill="#B7EDAA" className="pulse-ring" /> : null}
        <circle r="13" fill="#B7EDAA" stroke="#17633A" strokeWidth="2" />
        <circle r="4" fill="#17633A" />
      </g>
      {labels ? (
        <g fontSize="11" fontWeight="600" fill="#17251C" textAnchor="middle">
          <text x={P0.x} y={P0.y + 34}>Store</text>
          <text x={r.x} y={r.y + 30}>Rider</text>
          <text x={P2.x} y={P2.y + 34}>You</text>
        </g>
      ) : null}
    </svg>
  );
}
