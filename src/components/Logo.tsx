export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <rect width="40" height="40" rx="12" fill="#15843A" />
        <path d="M9 27c6-12 16-12 22-2" fill="none" stroke="#CFF1C4" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="9" cy="27" r="3.2" fill="#fff" />
        <circle cx="31" cy="25" r="3.2" fill="#CFF1C4" />
        <circle cx="20" cy="18.6" r="2.4" fill="#fff" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-ink">Krip<span className="text-brand">Fresh</span></span>
    </span>
  );
}
