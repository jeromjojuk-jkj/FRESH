import { query, tx } from "./db";
import { ApiError } from "./http";
import { hoursLabel, isOpenNow, type StoreRow } from "./stores";
import { CATEGORIES } from "../types";

// Every function takes the signed-in store's id; queries are always filtered by it.

export async function storeSettings(storeId: string) {
  const { rows } = await query<StoreRow>(`SELECT * FROM stores WHERE id=$1`, [storeId]);
  const s = rows[0];
  if (!s) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found.");
  return {
    id: s.id, name: s.name, area: s.area, address: s.address, phone: s.phone,
    openTime: s.open_time, closeTime: s.close_time, hoursLabel: hoursLabel(s), openNow: isOpenNow(s),
    prepMinutes: s.prep_minutes, acceptingOrders: s.accepting_orders, maxActiveOrders: s.max_active_orders,
    deliveryFee: s.delivery_fee, freeDeliveryAbove: s.free_delivery_above,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export async function updateSettings(storeId: string, p: any) {
  const sets: string[] = [];
  const vals: unknown[] = [storeId];
  const add = (col: string, v: unknown) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
  if (p.acceptingOrders !== undefined) add("accepting_orders", !!p.acceptingOrders);
  if (p.prepMinutes !== undefined) {
    const n = Math.floor(Number(p.prepMinutes));
    if (!(n >= 2 && n <= 90)) throw new ApiError(400, "BAD_PREP", "Preparation time must be between 2 and 90 minutes.");
    add("prep_minutes", n);
  }
  if (p.openTime !== undefined || p.closeTime !== undefined) {
    if (!TIME.test(p.openTime) || !TIME.test(p.closeTime)) throw new ApiError(400, "BAD_HOURS", "Use 24-hour times like 07:00 and 22:30.");
    add("open_time", p.openTime); add("close_time", p.closeTime);
  }
  if (p.maxActiveOrders !== undefined) {
    const n = Math.floor(Number(p.maxActiveOrders));
    if (!(n >= 1 && n <= 200)) throw new ApiError(400, "BAD_CAPACITY", "Capacity must be between 1 and 200 orders.");
    add("max_active_orders", n);
  }
  if (sets.length) await query(`UPDATE stores SET ${sets.join(", ")} WHERE id=$1`, vals);
  return storeSettings(storeId);
}

export async function inventory(storeId: string, text = "") {
  const t = `%${text.trim().toLowerCase()}%`;
  const { rows } = await query(
    `SELECT sp.id, p.id AS "productId", p.name, p.brand, p.category, p.pack_label AS "packLabel", p.barcode, p.image,
       sp.price, sp.mrp, sp.stock, sp.active
     FROM store_products sp JOIN products p ON p.id=sp.product_id
     WHERE sp.store_id=$1 AND (lower(p.name || ' ' || p.brand || ' ' || COALESCE(p.barcode,'')) LIKE $2)
     ORDER BY (sp.stock = 0) DESC, p.category, p.name, p.pack_label`,
    [storeId, t],
  );
  return rows;
}

export async function updateInventoryItem(storeId: string, spId: number, p: any) {
  const sets: string[] = [];
  const vals: unknown[] = [spId, storeId];
  const add = (col: string, v: unknown) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
  if (p.price !== undefined) {
    const n = Math.round(Number(p.price));
    if (!(n > 0 && n < 10_000_000)) throw new ApiError(400, "BAD_PRICE", "Enter a valid price.");
    add("price", n);
  }
  if (p.stock !== undefined) {
    const n = Math.floor(Number(p.stock));
    if (!(n >= 0 && n < 100000)) throw new ApiError(400, "BAD_STOCK", "Stock must be 0 or more.");
    add("stock", n);
  }
  if (p.active !== undefined) add("active", !!p.active);
  if (!sets.length) throw new ApiError(400, "NOTHING_TO_UPDATE", "Nothing to update.");
  const r = await query(`UPDATE store_products SET ${sets.join(", ")}, updated_at=now() WHERE id=$1 AND store_id=$2 RETURNING id`, vals);
  if (!r.rowCount) throw new ApiError(404, "NOT_FOUND", "Product not found in your store.");
  return { ok: true };
}

// ---------------------------------------------------------------- import

export type ImportRow = { barcode: string; name: string; category: string; packSize: string; price: number; stock: number };
export type PreviewRow = ImportRow & { line: number; action: "create" | "update" | "error"; errors: string[] };

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  barcode: ["barcode", "ean", "upc", "sku barcode", "gtin"],
  name: ["product name", "name", "product", "item", "item name"],
  category: ["category", "dept", "department"],
  packSize: ["pack size", "pack", "size", "weight", "pack size / weight", "unit"],
  price: ["selling price", "price", "sp", "mrp price", "sale price"],
  stock: ["stock quantity", "stock", "qty", "quantity", "stock qty"],
};

function categorySlug(v: string): string | null {
  const s = v.trim().toLowerCase();
  const hit = CATEGORIES.find((c) => c.slug === s || c.name.toLowerCase() === s || c.name.toLowerCase().replace(/&/g, "and") === s || c.name.toLowerCase().split(" ")[0] === s.split(" ")[0]);
  return hit?.slug ?? null;
}

/** Maps a parsed table (all cells as strings) to import rows, validating each. */
export async function previewImport(storeId: string, table: string[][]): Promise<{ rows: PreviewRow[]; missingColumns: string[] }> {
  if (!table.length) throw new ApiError(400, "EMPTY_FILE", "The file is empty.");
  const header = table[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx = {} as Record<keyof ImportRow, number>;
  const missing: string[] = [];
  for (const [k, aliases] of Object.entries(HEADER_ALIASES) as [keyof ImportRow, string[]][]) {
    idx[k] = header.findIndex((h) => aliases.includes(h));
    if (idx[k] < 0) missing.push(aliases[0]);
  }
  if (missing.length) return { rows: [], missingColumns: missing };

  const body = table.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== "")).slice(0, 2000);
  const barcodes = body.map((r) => String(r[idx.barcode] ?? "").trim());
  const { rows: existing } = await query(
    `SELECT p.barcode, sp.id AS sp FROM products p LEFT JOIN store_products sp ON sp.product_id=p.id AND sp.store_id=$1 WHERE p.barcode = ANY($2::text[])`,
    [storeId, barcodes],
  );
  const known = new Map(existing.map((e) => [e.barcode, e.sp]));
  const seen = new Set<string>();
  const rows: PreviewRow[] = body.map((r, i) => {
    const get = (k: keyof ImportRow) => String(r[idx[k]] ?? "").trim();
    const errors: string[] = [];
    const barcode = get("barcode"); // kept as text: leading zeros preserved
    if (!/^\d{6,14}$/.test(barcode)) errors.push("Barcode must be 6–14 digits");
    if (seen.has(barcode)) errors.push("Duplicate barcode in file");
    seen.add(barcode);
    const name = get("name");
    if (!name) errors.push("Product name is missing");
    const cat = categorySlug(get("category"));
    if (!cat) errors.push(`Unknown category "${get("category")}"`);
    const packSize = get("packSize");
    if (!packSize) errors.push("Pack size is missing");
    const priceR = Number(get("price").replace(/[₹,\s]/g, ""));
    if (!(priceR > 0)) errors.push("Selling price must be more than 0");
    const stock = Number(get("stock").replace(/[,\s]/g, ""));
    if (!Number.isInteger(stock) || stock < 0) errors.push("Stock must be a whole number, 0 or more");
    return {
      line: i + 2, barcode, name, category: cat ?? get("category"), packSize, price: Math.round(priceR * 100), stock,
      action: errors.length ? "error" : known.has(barcode) ? "update" : "create", errors,
    };
  });
  return { rows, missingColumns: [] };
}

export async function commitImport(storeId: string, table: string[][]) {
  // Re-run validation on the server; never trust the preview the browser sends back.
  const { rows, missingColumns } = await previewImport(storeId, table);
  if (missingColumns.length) throw new ApiError(400, "MISSING_COLUMNS", `Missing columns: ${missingColumns.join(", ")}`);
  const valid = rows.filter((r) => r.action !== "error");
  let created = 0, updated = 0;
  await tx(async (q) => {
    for (const r of valid) {
      const { rows: pr } = await q(`SELECT id FROM products WHERE barcode=$1`, [r.barcode]);
      let pid = pr[0]?.id as string | undefined;
      if (!pid) {
        pid = `imp-${storeId}-${r.barcode}`;
        await q(`INSERT INTO products (id,group_key,name,brand,category,pack_label,barcode,image,tags,created_by_store) VALUES ($1,$1,$2,'',$3,$4,$5,'/img/p/basket.webp','',$6)`, [pid, r.name, r.category, r.packSize, r.barcode, storeId]);
      }
      const up = await q(
        `INSERT INTO store_products (store_id,product_id,price,mrp,stock) VALUES ($1,$2,$3,$3,$4)
         ON CONFLICT (store_id,product_id) DO UPDATE SET price=EXCLUDED.price, stock=EXCLUDED.stock, active=TRUE, updated_at=now()
         RETURNING (xmax = 0) AS inserted`,
        [storeId, pid, r.price, r.stock],
      );
      if (up.rows[0]?.inserted) created++; else updated++;
    }
  });
  return { created, updated, skipped: rows.length - valid.length };
}
