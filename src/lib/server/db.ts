import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";

/**
 * Database access. Uses real PostgreSQL when DATABASE_URL is set (e.g. Supabase),
 * otherwise an embedded PostgreSQL (PGlite) persisted to ./.data/pglite so the demo
 * runs with zero setup. Both run the same SQL.
 */
export type Row = Record<string, any>;
export type Q = <T extends Row = Row>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;

type Driver = {
  query: Q;
  tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>;
};

const g = globalThis as unknown as { __nbDb?: Promise<Driver> };

async function createPg(url: string): Promise<Driver> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 10, ssl: /supabase|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined });
  const query: Q = async (sql, params = []) => {
    const r = await pool.query(sql, params as any[]);
    return { rows: r.rows, rowCount: r.rowCount ?? 0 };
  };
  const tx: Driver["tx"] = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const q: Q = async (sql, params = []) => {
        const r = await client.query(sql, params as any[]);
        return { rows: r.rows, rowCount: r.rowCount ?? 0 };
      };
      const result = await fn(q);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  };
  return { query, tx };
}

async function createPglite(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? (process.env.NODE_ENV === "test" ? undefined : "./.data/pglite");
  if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const db = dir ? new PGlite(dir) : new PGlite();
  await db.waitReady;
  // PGlite has a single connection: serialise all work through one queue so a
  // transaction is never interleaved with another request's statements.
  let chain: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };
  const raw: Q = async (sql, params = []) => {
    if (!params.length && /;\s*\S/.test(sql)) {
      await db.exec(sql); // multi-statement scripts (schema, DDL)
      return { rows: [], rowCount: 0 };
    }
    const r = await db.query(sql, params as any[]);
    return { rows: r.rows as any[], rowCount: r.affectedRows ?? r.rows.length };
  };
  const query: Q = (sql, params) => exclusive(() => raw(sql, params));
  const tx: Driver["tx"] = (fn) =>
    exclusive(async () => {
      await db.exec("BEGIN");
      try {
        const res = await fn(raw);
        await db.exec("COMMIT");
        return res;
      } catch (e) {
        await db.exec("ROLLBACK").catch(() => {});
        throw e;
      }
    });
  return { query, tx };
}

async function init(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  const driver = url ? await createPg(url) : await createPglite();
  await driver.tx(async (q) => {
    await q(SCHEMA_SQL);
    const { rows } = await q("SELECT count(*)::int AS n FROM stores");
    if (rows[0].n === 0) await seedDatabase(q);
  });
  return driver;
}

function driver(): Promise<Driver> {
  if (!g.__nbDb) g.__nbDb = init().catch((e) => { g.__nbDb = undefined; throw e; });
  return g.__nbDb;
}

export const query: Q = async (sql, params) => (await driver()).query(sql, params);
export async function tx<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  return (await driver()).tx(fn);
}

/** Drops everything and re-seeds. Used by the demo reset button and tests. */
export async function resetDatabase(): Promise<void> {
  await tx(async (q) => {
    await q(`DROP TABLE IF EXISTS order_events, order_items, orders, rider_locations, riders, store_products, products, customers, stores CASCADE`);
    await q(SCHEMA_SQL);
    await seedDatabase(q);
  });
}
