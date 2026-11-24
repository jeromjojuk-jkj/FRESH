import type { Q } from "./db";
import type { CatalogueProduct } from "../types";

const SELECT = `SELECT p.id AS "productId", p.group_key AS "groupKey", p.name, p.brand, p.category, p.pack_label AS "packLabel",
  p.image, sp.price, sp.mrp, sp.stock, (sp.stock > 0) AS "inStock"
  FROM store_products sp JOIN products p ON p.id = sp.product_id
  WHERE sp.store_id = $1 AND sp.active`;

export async function catalogue(q: Q, storeId: string, category?: string): Promise<CatalogueProduct[]> {
  const { rows } = category
    ? await q<CatalogueProduct>(`${SELECT} AND p.category=$2 ORDER BY (sp.stock>0) DESC, p.name, sp.price`, [storeId, category])
    : await q<CatalogueProduct>(`${SELECT} ORDER BY p.category, (sp.stock>0) DESC, p.name, sp.price`, [storeId]);
  return rows;
}

/** "Fresh from this store": in-stock produce and dairy first. */
export async function featured(q: Q, storeId: string): Promise<CatalogueProduct[]> {
  const { rows } = await q<CatalogueProduct>(
    `${SELECT} AND sp.stock > 0 AND p.category IN ('fruits-vegetables','dairy-eggs')
     ORDER BY CASE p.category WHEN 'fruits-vegetables' THEN 0 ELSE 1 END, p.name, sp.price LIMIT 12`,
    [storeId],
  );
  return rows;
}

function terms(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 5);
}

/** Search only within the selected store's catalogue. Matches names, brands and local names (dahi, aloo…). */
export async function search(q: Q, storeId: string, text: string): Promise<CatalogueProduct[]> {
  const t = terms(text);
  if (!t.length) return [];
  const conds = t.map((_, i) => "(lower(p.name || ' ' || p.brand || ' ' || p.tags || ' ' || p.category || ' ' || p.pack_label) LIKE $" + (i + 2) + ")");
  const { rows } = await q<CatalogueProduct>(
    `${SELECT} AND ${conds.join(" AND ")} ORDER BY (sp.stock>0) DESC, (lower(p.name) LIKE $2) DESC, p.name, sp.price LIMIT 40`,
    [storeId, ...t.map((x) => `%${x}%`)],
  );
  return rows;
}

export async function suggest(q: Q, storeId: string, text: string): Promise<string[]> {
  const t = text.trim().toLowerCase();
  if (t.length < 1) return [];
  const { rows } = await q<{ name: string }>(
    `SELECT DISTINCT p.name FROM store_products sp JOIN products p ON p.id=sp.product_id
     WHERE sp.store_id=$1 AND sp.active AND (lower(p.name) LIKE $2 OR lower(p.tags) LIKE $3 OR lower(p.brand) LIKE $2
       OR lower(p.name) LIKE $4)
     ORDER BY p.name LIMIT 6`,
    [storeId, `${t}%`, `%${t}%`, `% ${t}%`],
  );
  return rows.map((r) => r.name);
}

/** Products this customer bought before from this store, priced at this store today. */
export async function buyAgain(q: Q, storeId: string, customerId: string): Promise<CatalogueProduct[]> {
  const { rows } = await q<CatalogueProduct>(
    `${SELECT} AND p.id IN (
       SELECT oi.product_id FROM order_items oi JOIN orders o ON o.id=oi.order_id
       WHERE o.customer_id=$2 AND o.store_id=$1 AND o.status='delivered')
     ORDER BY (sp.stock>0) DESC, p.name LIMIT 12`,
    [storeId, customerId],
  );
  return rows;
}

/** Alternatives for a short item: same group first, then same category; in stock at the same store. */
export async function alternatives(q: Q, storeId: string, productId: string): Promise<CatalogueProduct[]> {
  const { rows } = await q<CatalogueProduct>(
    `${SELECT} AND sp.stock > 0 AND p.id <> $2 AND (
       p.group_key = (SELECT group_key FROM products WHERE id=$2) OR p.category = (SELECT category FROM products WHERE id=$2))
     ORDER BY (p.group_key = (SELECT group_key FROM products WHERE id=$2)) DESC,
       abs(sp.price - COALESCE((SELECT price FROM store_products WHERE store_id=$1 AND product_id=$2), 0)) LIMIT 6`,
    [storeId, productId],
  );
  return rows;
}
