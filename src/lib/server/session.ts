import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { query } from "./db";
import { ApiError } from "./http";
import type { Role } from "../types";

/**
 * Demo sessions: a signed cookie naming the role and account. Swap for real auth
 * (OTP login, Supabase Auth, etc.) without touching the services, which all take
 * the actor explicitly.
 */
export type Session = { role: Role; id: string };
const COOKIE = "nb_session";
const secret = () => process.env.SESSION_SECRET || "nearbasket-demo-secret-change-me";

function sign(v: string) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}
export function encodeSession(s: Session) {
  const v = `${s.role}:${s.id}`;
  return `${v}.${sign(v)}`;
}
export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const v = raw.slice(0, i);
  const a = Buffer.from(raw.slice(i + 1));
  const b = Buffer.from(sign(v));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [role, id] = v.split(":");
  if (!["customer", "store", "rider"].includes(role) || !id) return null;
  return { role: role as Role, id };
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export async function setSession(s: Session) {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(s), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180, secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1" });
}

/** Customer session; creates a guest customer on first visit. */
export async function requireCustomer(): Promise<string> {
  const s = await getSession();
  if (s?.role === "customer") {
    const { rows } = await query(`SELECT id FROM customers WHERE id=$1`, [s.id]);
    if (rows.length) return s.id;
  }
  const id = "guest-" + randomBytes(6).toString("hex");
  await query(`INSERT INTO customers (id,name) VALUES ($1,'Guest')`, [id]);
  await setSession({ role: "customer", id });
  return id;
}

export async function requireRole(role: "store" | "rider"): Promise<string> {
  const s = await getSession();
  if (s?.role !== role) throw new ApiError(401, "NOT_SIGNED_IN", role === "store" ? "Sign in as a supermarket to continue." : "Sign in as a delivery partner to continue.");
  return s.id;
}
