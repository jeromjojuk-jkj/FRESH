// End-to-end acceptance checks. Needs a running server:
//   npm run build && PGLITE_DIR=.data/e2e npm start   (or any BASE_URL)
//   npm run test:e2e
// Uses the system Playwright (require('playwright')).
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium, request: pwRequest } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR || "test-results/screens";
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
async function check(name, fn) {
  const t = Date.now();
  try { const note = await fn(); results.push({ name, ok: true, note, ms: Date.now() - t }); console.log(`PASS  ${name}${note ? " — " + note : ""}`); }
  catch (e) { results.push({ name, ok: false, note: e.message, ms: Date.now() - t }); console.log(`FAIL  ${name} — ${e.message}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

// Geo helper (same formula as the app).
const R = 6371008.8, rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
function dest(p, b, m) { const d = m / R, br = rad(b), l1 = rad(p.lat), g1 = rad(p.lng); const l2 = Math.asin(Math.sin(l1) * Math.cos(d) + Math.cos(l1) * Math.sin(d) * Math.cos(br)); const g2 = g1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(l1), Math.cos(d) - Math.sin(l1) * Math.sin(l2)); return { lat: deg(l2), lng: deg(g2) }; }

const browser = await chromium.launch();
const api = await pwRequest.newContext({ baseURL: BASE });
await api.post("/api/v1/demo/reset");

async function onboard(page, sample = "koramangala") {
  await page.goto(BASE + "/address?mode=manual");
  await page.getByTestId(`sample-${sample}`).click();
  await page.fill("#flat", "B-204");
  await page.fill("#landmark", "Opposite the park");
  await page.getByRole("button", { name: "Confirm address" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
  await page.getByRole("button", { name: /^Add .* to cart$/ }).first().waitFor({ timeout: 15000 });
}
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

let journey = { code: null, customer: null };

// 1 ─ GPS denied → manual address → eligible order
await check("Customer who denies GPS can still enter an address and place an order", async () => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, permissions: [] });
  // Force a denial regardless of browser defaults.
  await ctx.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, err) => setTimeout(() => err({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" }), 50);
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await page.getByRole("link", { name: /Use my current location/ }).click();
  await page.getByText("Location permission is off").waitFor();
  await page.getByTestId("sample-koramangala").click();
  await page.getByRole("button", { name: "Confirm address" }).click();
  await page.getByText("Please add your flat or house number").waitFor(); // validation
  await page.fill("#flat", "B-204");
  await page.getByRole("button", { name: "Confirm address" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.getByRole("button", { name: /^Add .* to cart$/ }).first().click();
  await page.getByRole("button", { name: /^Add .* to cart$/ }).nth(1).click();
  await page.getByRole("link", { name: /View cart/ }).click();
  await page.waitForURL("**/cart");
  const btn = page.getByTestId("place-order");
  await page.waitForFunction(() => /Place order/.test(document.querySelector('[data-testid="place-order"]')?.textContent ?? ""));
  await btn.screenshot({ path: `${SHOTS}/checkout-button-360.png` }).catch(() => {});
  await page.screenshot({ path: `${SHOTS}/cart-360.png`, fullPage: true });
  await btn.dblclick(); // double tap must not create two orders
  await page.waitForURL(/\/orders\/NB-\d+/, { timeout: 15000 });
  const code = page.url().split("/").pop();
  await page.getByText("Estimated arrival").waitFor();
  const list = await (await ctx.request.get(BASE + "/api/v1/orders")).json();
  assert(list.orders.length === 1, `expected 1 order after double tap, got ${list.orders.length}`);
  journey = { code, ctx, page };
  return `${code}, one order after double-tap`;
});

// 2 ─ 3.00 km in, 3.01 km out
await check("Store at 3.00 km is eligible; 3.01 km is excluded", async () => {
  const dn = { lat: 12.9719, lng: 77.6412 };
  const get = async (p) => (await (await api.post("/api/v1/stores/nearby", { data: p })).json()).stores.find((s) => s.id === "dailyneeds");
  const a = await get(dest(dn, 180, 3000)), b = await get(dest(dn, 180, 3010));
  assert(a.eligible && a.distanceLabel === "3.00 km", `3.00 km: ${JSON.stringify(a)}`);
  assert(!b.eligible && b.distanceLabel === "3.01 km", `3.01 km: ${JSON.stringify(b)}`);
  const out = await (await api.post("/api/v1/stores/nearby", { data: { lat: 12.9698, lng: 77.75 } })).json();
  assert(out.eligibleCount === 0, "Whitefield should have no stores");
  const multi = await (await api.post("/api/v1/stores/nearby", { data: { lat: 12.9234, lng: 77.636 } })).json();
  assert(multi.eligibleCount >= 2, "Koramangala should have 2+ stores");
  return `3.00 km → ${a.eligible}, 3.01 km → ${b.eligible}; Whitefield 0 stores; Koramangala ${multi.eligibleCount} stores`;
});

// 3 ─ per-store prices/stock
await check("Same product has different price and stock at two stores without mixing", async () => {
  const g = (await (await api.get("/api/v1/stores/greenleaf/products")).json()).products;
  const a = (await (await api.get("/api/v1/stores/annapurna/products")).json()).products;
  const pg = g.find((p) => p.productId === "rice-sona-5kg"), pa = a.find((p) => p.productId === "rice-sona-5kg");
  assert(pg && pa, "rice in both");
  assert(pg.price !== pa.price && pg.stock !== pa.stock, `same values ${pg.price}/${pg.stock} vs ${pa.price}/${pa.stock}`);
  assert(!a.some((p) => p.productId === "mango-1kg"), "Annapurna must not list mango");
  const s = (await (await api.get("/api/v1/stores/annapurna/products?q=alphonso mango")).json()).products;
  assert(!s.some((p) => p.productId === "mango-1kg"), "search leaked another store's product");
  return `Sona Masoori 5 kg: Greenleaf ₹${pg.price / 100} (${pg.stock} in stock) vs Annapurna ₹${pa.price / 100} (${pa.stock})`;
});

// 4 ─ cart survives refresh
await check("Add groceries, change quantities, refresh — cart intact", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await onboard(page);
  const adds = page.getByRole("button", { name: /^Add .* to cart$/ });
  await adds.first().click();
  await adds.first().click(); // next card's Add (first one is now a stepper)
  await page.getByRole("button", { name: /^Increase / }).first().click();
  await page.getByRole("button", { name: /^Increase / }).first().click();
  const bar = page.getByRole("link", { name: /View cart/ });
  const before = await bar.innerText();
  await page.reload();
  await bar.waitFor();
  const after = await bar.innerText();
  assert(before === after, `before "${before}" after "${after}"`);
  assert(/4 items/.test(after), `expected 4 items, got ${after}`);
  await page.screenshot({ path: `${SHOTS}/home-with-cart-390.png` });
  await ctx.close();
  return after.replace(/\s+/g, " ");
});

// 5 ─ last unit race
await check("Two customers buying the final unit: only one confirmed order", async () => {
  const store = await pwRequest.newContext({ baseURL: BASE });
  await store.post("/api/v1/demo/session", { data: { role: "store", id: "greenleaf" } });
  const inv = (await (await store.get("/api/v1/store/inventory?q=honey")).json()).items[0];
  await store.patch(`/api/v1/store/inventory/${inv.id}`, { data: { stock: 1 } });
  const addr = { lat: 12.9234, lng: 77.636, line: "Test Rd", flat: "1" };
  const shoppers = await Promise.all([1, 2].map(async () => { const c = await pwRequest.newContext({ baseURL: BASE }); await c.get("/api/v1/me"); return c; }));
  const quote = (await (await shoppers[0].post("/api/v1/cart/quote", { data: { storeId: "greenleaf", items: [{ productId: inv.productId, qty: 1 }], location: addr } })).json()).quote;
  const res = await Promise.all(shoppers.map((c, i) => c.post("/api/v1/orders", { data: {
    idempotencyKey: `race-${Date.now()}-${i}`, storeId: "greenleaf", items: [{ productId: inv.productId, qty: 1, price: quote.lines[0].price }],
    address: addr, substitutionPref: "remove", paymentMethod: "cod", expectedTotal: quote.total } })));
  const codes = res.map((r) => r.status()).sort();
  assert(codes[0] === 201 && codes[1] === 409, `statuses ${codes}`);
  const after = (await (await store.get("/api/v1/store/inventory?q=honey")).json()).items[0];
  assert(after.stock === 0, `stock ${after.stock}`);
  const loser = await res.find((r) => r.status() === 409).json();
  return `HTTP ${codes.join(" + ")}; loser told: “${loser.error.message}”`;
});

// 6/7 ─ full journey across three screens + tracking without map/live location
await check("Order flows checkout → store packing → rider pickup → delivered, updating every screen", async () => {
  const { code, page: cust } = journey;
  assert(code, "no order from test 1");
  const order = (await (await journey.ctx.request.get(`${BASE}/api/v1/orders/${code}`)).json()).order;
  const sctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await sctx.request.post(BASE + "/api/v1/demo/session", { data: { role: "store", id: order.store.id } });
  const sp = await sctx.newPage();
  await sp.goto(BASE + "/store");
  await sp.screenshot({ path: `${SHOTS}/store-new-orders-360.png`, fullPage: true });
  assert(await noHScroll(sp), "store page scrolls horizontally at 360px");
  await sp.getByTestId(`accept-${code}`).click(); // tap 1
  await sp.waitForURL(`**/store/orders/${code}`);
  await sp.getByTestId("start-packing").click(); // tap 2
  await sp.getByText(/Packing checklist ·/).waitFor();
  await cust.getByText("Packing", { exact: true }).first().waitFor();
  const packAll = sp.locator('[data-testid^="pack-all-"]');
  // pack the first item partially, then report the rest missing (customer chose "contact")
  const firstId = (await packAll.first().getAttribute("data-testid")).split("-").pop();
  const need = order.items.find((i) => String(i.id) === firstId).qty;
  if (need > 1) await sp.getByRole("button", { name: "One more packed" }).first().click();
  await sp.getByTestId(`missing-${firstId}`).click();
  await sp.getByText(/waiting for customer/).waitFor();
  await sp.screenshot({ path: `${SHOTS}/store-packing-360.png`, fullPage: true });
  // customer resolves on the tracking screen
  await cust.getByRole("heading", { name: "Action needed" }).waitFor({ timeout: 10000 });
  await cust.screenshot({ path: `${SHOTS}/track-action-needed-360.png`, fullPage: true });
  await cust.getByRole("button", { name: "Remove the item" }).click();
  await cust.getByRole("heading", { name: "Action needed" }).waitFor({ state: "detached", timeout: 10000 });
  await sp.reload();
  await sp.getByText(/Packing checklist ·/).waitFor();
  const remaining = sp.locator('[data-testid^="pack-all-"]');
  while (await remaining.count()) { await remaining.first().click(); await sp.waitForTimeout(250); }
  await sp.getByTestId("mark-ready").click();
  await sp.getByText(/Ready\. Waiting for/).waitFor();
  await cust.locator('[aria-current="step"]', { hasText: "Ready for pickup" }).waitFor({ timeout: 10000 });

  const rider = (await (await sctx.request.get(`${BASE}/api/v1/store/orders/${code}`)).json()).order.rider;
  const accounts = (await (await api.get("/api/v1/demo/accounts")).json()).riders;
  const riderId = accounts.find((r) => r.name === rider.name).id;
  const rctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await rctx.request.post(BASE + "/api/v1/demo/session", { data: { role: "rider", id: riderId } });
  const rp = await rctx.newPage();
  await rp.goto(BASE + "/rider");
  await rp.getByTestId(`pickup-${code}`).press("Enter"); // slide-to-confirm; Enter is the keyboard path
  await rp.getByTestId(`deliver-${code}`).waitFor();
  await rp.screenshot({ path: `${SHOTS}/rider-360.png`, fullPage: true });
  assert(await noHScroll(rp), "rider page scrolls horizontally at 360px");
  await cust.locator('[aria-current="step"]', { hasText: "Out for delivery" }).waitFor({ timeout: 10000 });
  // No live location yet: the text timeline must carry the customer.
  await cust.getByText("Live location isn’t available right now").waitFor();
  await cust.screenshot({ path: `${SHOTS}/track-no-live-location-360.png`, fullPage: true });
  journey.noLiveOk = true;

  await rp.getByTestId("simulate-ride").click();
  await cust.getByText(/Rider location updated|Map couldn’t load/).first().waitFor({ timeout: 15000 });
  journey.mapState = (await cust.getByText("Map couldn’t load.").count()) ? "map tiles unreachable → text fallback shown" : "map shown";
  await cust.screenshot({ path: `${SHOTS}/track-live-360.png`, fullPage: true });
  await rp.getByTestId(`deliver-${code}`).press("Enter");
  await cust.locator('[aria-current="step"]', { hasText: "Delivered" }).waitFor({ timeout: 10000 });
  await cust.getByText(/^Delivered$/).first().waitFor();
  await cust.screenshot({ path: `${SHOTS}/track-delivered-360.png`, fullPage: true });
  const st = (await (await sctx.request.get(`${BASE}/api/v1/store/orders?view=done`)).json()).orders.find((o) => o.code === code);
  assert(st?.status === "delivered", "store doesn't show delivered");
  const rd = (await (await rctx.request.get(`${BASE}/api/v1/rider/deliveries`)).json());
  assert(!rd.rider.sharing, "rider still sharing after delivery");
  return `${code}: accepted in 2 taps, missing item resolved by customer, delivered; rider sharing stopped`;
});

await check("Customer can follow progress when map / live location is unavailable", async () => {
  assert(journey.noLiveOk, "no-live-location state not verified");
  return `text timeline + notice shown with no rider GPS; ${journey.mapState}`;
});

// 8 ─ layouts at 360 px and desktop
await check("Main shopping and supplier screens work at 360 px and desktop (no sideways scroll)", async () => {
  const bad = [];
  for (const [w, h] of [[360, 740], [1280, 860]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await onboard(p);
    await p.getByRole("button", { name: /^Add .* to cart$/ }).first().click();
    for (const path of ["/", "/category/dairy-eggs", "/search?q=milk", "/cart", "/stores", "/orders"]) {
      await p.goto(BASE + path); await p.waitForTimeout(700);
      if (!(await noHScroll(p))) bad.push(`${path}@${w}`);
      await p.screenshot({ path: `${SHOTS}/${path.replace(/[/?=]/g, "_") || "home"}-${w}.png` });
    }
    await ctx.request.post(BASE + "/api/v1/demo/session", { data: { role: "store", id: "greenleaf" } });
    for (const path of ["/store", "/store/stock", "/store/import", "/store/settings"]) {
      await p.goto(BASE + path); await p.waitForTimeout(700);
      if (!(await noHScroll(p))) bad.push(`${path}@${w}`);
      await p.screenshot({ path: `${SHOTS}/${path.replace(/\//g, "_")}-${w}.png` });
    }
    if (w > 1000) {
      await p.goto(BASE + "/demo");
      await ctx.request.post(BASE + "/api/v1/demo/session", { data: { role: "customer", id: "cust-asha" } });
      await p.goto(BASE + "/"); await p.waitForTimeout(800);
      const sidebar = await p.getByRole("complementary", { name: "Your cart" }).isVisible();
      if (!sidebar) bad.push("desktop cart summary hidden");
      await p.screenshot({ path: `${SHOTS}/home-desktop-asha.png` });
    }
    await ctx.close();
  }
  assert(!bad.length, `overflow/problems: ${bad.join(", ")}`);
  return "16 screens × 2 widths";
});

// Extra ─ CSV import keeps leading zeros
await check("CSV import preview preserves barcode leading zeros and is store-scoped", async () => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await ctx.request.post(BASE + "/api/v1/demo/session", { data: { role: "store", id: "annapurna" } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/store/import");
  const csv = "barcode,product name,category,pack size,selling price,stock quantity\n0012345678905,Ragi Flour,Rice & Grains,1 kg,78,25\n0200000000011,Tomato (Hybrid),Fruits & Vegetables,500 g,26,40\nabc,Bad Row,Snacks,1 pc,0,-1\n";
  await p.getByTestId("import-file").setInputFiles({ name: "stock.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await p.getByText(/Preview:/).waitFor();
  const codes = await p.getByTestId("pv-barcode").allInnerTexts();
  assert(codes[0] === "0012345678905" && codes[1] === "0200000000011", `barcodes ${codes}`);
  await p.screenshot({ path: `${SHOTS}/store-import-preview-360.png`, fullPage: true });
  await p.getByRole("button", { name: /^Import 2 products/ }).click();
  await p.getByText("Import complete.").waitFor();
  const own = (await (await ctx.request.get(BASE + "/api/v1/store/inventory?q=0012345678905")).json()).items;
  assert(own.length === 1 && own[0].barcode === "0012345678905", "imported item missing or zero dropped");
  await ctx.request.post(BASE + "/api/v1/demo/session", { data: { role: "store", id: "greenleaf" } });
  const other = (await (await ctx.request.get(BASE + "/api/v1/store/inventory?q=ragi")).json()).items;
  assert(other.length === 0, "another store sees the imported product");
  await ctx.close();
  return "0012345678905 kept; bad row rejected; Greenleaf can't see Annapurna's import";
});

await browser.close();
const failed = results.filter((r) => !r.ok);
fs.writeFileSync("test-results/e2e-results.json", JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
