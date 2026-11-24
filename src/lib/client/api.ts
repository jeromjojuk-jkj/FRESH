"use client";

export class ApiErr extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any, public network = false) {
    super(message);
  }
}

/** JSON fetch with a consistent error shape. GETs retry once on a network failure. */
export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const opts: RequestInit = { credentials: "same-origin", ...rest, headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) } };
  if (json !== undefined) opts.body = JSON.stringify(json);
  const method = (opts.method ?? "GET").toUpperCase();
  let res: Response | undefined;
  for (let attempt = 0; attempt < (method === "GET" ? 2 : 1); attempt++) {
    try {
      res = await fetch(`/api/v1${path}`, opts);
      break;
    } catch {
      if (attempt === 0 && method === "GET") await new Promise((r) => setTimeout(r, 600));
    }
  }
  if (!res) throw new ApiErr(0, "NETWORK", "You seem to be offline or the connection dropped.", undefined, true);
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const e = data?.error;
    throw new ApiErr(res.status, e?.code ?? "HTTP_" + res.status, e?.message ?? "Something went wrong. Please try again.", e?.details, res.status >= 502);
  }
  return data as T;
}
