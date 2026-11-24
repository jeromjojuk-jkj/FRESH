export function timeIST(d: string | number | Date) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
export function ago(d: string | number | Date, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hr ago` : new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
export function minutesUntil(d: string | number | Date, now = Date.now()) {
  return Math.max(0, Math.round((new Date(d).getTime() - now) / 60000));
}
