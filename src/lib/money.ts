// All money is stored as integer paise to avoid floating-point errors.
export function rupees(paise: number): string {
  const r = paise / 100;
  return "₹" + (Number.isInteger(r) ? r.toLocaleString("en-IN") : r.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}
