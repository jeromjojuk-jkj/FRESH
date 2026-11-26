"use client";
import { useSyncExternalStore } from "react";
import type { DeliveryAddress } from "../types";

/** Tiny persisted store on localStorage. Survives refresh; safe when storage is blocked. */
function persisted<T>(key: string, initial: T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();
  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      cache = initial;
    }
    return cache!;
  };
  const write = (v: T) => {
    cache = v;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    listeners.forEach((l) => l());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) { cache = undefined; listeners.forEach((l) => l()); }
    });
  }
  const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
  return {
    get: read,
    set: (fn: (v: T) => T) => write(fn(read())),
    use: () => useSyncExternalStore(subscribe, read, () => initial),
  };
}

export type CartItem = { qty: number; name: string; packLabel: string; image: string; price: number };
export type CartState = { storeId: string | null; items: Record<string, CartItem>; updatedAt: number };

export const cart = persisted<CartState>("nb.cart.v1", { storeId: null, items: {}, updatedAt: 0 });

export type Setup = { address: DeliveryAddress | null; storeId: string | null; storeName: string | null; hydrated: boolean };
export const setup = persisted<Setup>("nb.setup.v1", { address: null, storeId: null, storeName: null, hydrated: true });

export function cartTotals(c: CartState) {
  let count = 0, subtotal = 0;
  for (const it of Object.values(c.items)) { count += it.qty; subtotal += it.qty * it.price; }
  return { count, subtotal, lines: Object.keys(c.items).length };
}

export function setQty(storeId: string, productId: string, qty: number, snap?: Omit<CartItem, "qty">) {
  cart.set((c) => {
    // One supermarket per cart: callers confirm with the customer before switching.
    const items = c.storeId === storeId ? { ...c.items } : {};
    const cur = items[productId];
    if (qty <= 0) delete items[productId];
    else if (cur) items[productId] = { ...cur, ...(snap ?? {}), qty };
    else if (snap) items[productId] = { ...snap, qty };
    return { storeId, items, updatedAt: Date.now() };
  });
}

export function clearCart() {
  cart.set(() => ({ storeId: null, items: {}, updatedAt: Date.now() }));
}

/** Favourite products, kept on this device. */
export const favs = persisted<{ ids: Record<string, 1> }>("kf.favs.v1", { ids: {} });
export function toggleFav(id: string) {
  favs.set((f) => {
    const ids = { ...f.ids };
    if (ids[id]) delete ids[id]; else ids[id] = 1;
    return { ids };
  });
}
