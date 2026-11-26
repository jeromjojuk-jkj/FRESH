# KripFresh

A mobile-first grocery delivery web app that connects customers with neighbourhood supermarkets **within 3.00 km**. It has three experiences in one installable PWA:

| Who | Where | What |
| --- | --- | --- |
| Customer | `/` | Confirm address (GPS or manual) → nearby stores → shop → checkout → live tracking |
| Supermarket staff | `/store` | New orders (default) → Accept → Start packing → checklist → Ready; stock, prices, hours, CSV/Excel import |
| Delivery partner | `/rider` | Assigned deliveries → Navigate → Confirm pickup → share location → Confirm delivery |
| Demo switcher | `/demo` | Switch between fictional customers, stores and riders; reset demo data |

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL** (real Postgres/Supabase via `DATABASE_URL`, or embedded PGlite with zero setup) · Leaflet + OpenStreetMap tiles.

## Run it

Requires Node 20+.

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

For development: `npm run dev`. With no `DATABASE_URL`, data lives in an embedded PostgreSQL at `./.data/pglite`, created and seeded on first request.

To use real PostgreSQL or Supabase:

```bash
cp .env.example .env.local      # then set DATABASE_URL and SESSION_SECRET
npm run db:reset                # creates tables and loads demo data
```

The schema (`src/lib/server/schema.ts`) is created automatically on boot and is plain PostgreSQL.

## Demo access

Open **`/demo`**, the clearly labelled demo switcher. It needs no passwords.

- **Customers:** *Asha Menon* (returning, with “Buy again”), *Ravi Kumar*, or **New visitor** (starts at the welcome screen).
- **Supermarkets:** Greenleaf Fresh Mart (Koramangala), Annapurna Supermarket (HSR Layout), Daily Needs Bazaar (Indiranagar). Each has its own prices and stock, and some items are out of stock.
- **Riders:** Imran S., Lakshmi R., Joseph D.
- **Sample addresses** appear on the manual address screen:
  - *Koramangala 1st Block* is served by **two** stores.
  - *Ejipura* is **exactly 3.00 km** from Daily Needs Bazaar, so that store is included.
  - *Whitefield* is **outside** the service area and shows the “Change address” message.
- **Payments:** Cash on delivery, or **UPI (simulated)**, which is a labelled demo screen where no money moves.
- **Live location:** on the rider screen, “Simulate ride” moves the rider from the store to the customer. “Pause sharing” simulates a lost signal: the customer keeps the last known point and sees how old it is.

Suggested walk-through: open three tabs (customer, `/store`, `/rider`). Place an order, then Accept and Start packing (2 taps). Pack the items, or report one missing to see the customer’s replacement prompt, then Mark ready. On the rider tab, Confirm pickup, Simulate ride and Confirm delivery. Each screen updates within a few seconds.

All demo stores are set to open 24 hours so the demo works at any time. Change hours in Store → Settings to see the “Closed” state.

## Key rules, and where they live

- **3 km rule:** `src/lib/geo.ts`. The server computes straight-line distance with the haversine formula, to the whole metre. A store is eligible when the distance is ≤ 3,000 m, so 3.00 km is in and 3.01 km is out. Road travel time is estimated separately (`providers/routing.ts`) and used only for delivery estimates.
- **One store per cart:** when the store or address changes, the customer sees which items move, which prices change and which items are unavailable. Nothing is cleared without their choice (`src/app/stores/page.tsx`).
- **Order placement** (`placeOrder` in `src/lib/server/orders.ts`) re-checks store hours, the paused/accepting flag, delivery capacity, radius, prices, total and stock inside one transaction. Stock is taken with `UPDATE … WHERE stock >= qty`, so the last unit can only be sold once. An idempotency key makes double taps and retries return the same order. If prices changed, the order is refused with the new total; the charge is never silently increased.
- **Unavailable items:** the customer chooses “Contact me about a replacement” or “Remove the item” at checkout. Staff can never substitute on their own. A replacement is only added when the customer approves it, with the price difference shown first.
- **Estimates** combine packing time, store queue, rider availability and travel time. They are shown as a window and revised, with a reason, when they slip.
- **Privacy:** a customer sees only the rider assigned to their own order, and only while it is out for delivery. Riders share location only during an active delivery, and the location is deleted when the delivery completes. Every store API filters by the signed-in store.

## APIs, for a future Android or iOS app

All business logic is behind JSON endpoints under `/api/v1`, which a native app can reuse:
`stores/nearby`, `stores/:id/products`, `stores/:id/suggest`, `cart/quote`, `orders`, `orders/:code`, `orders/:code/items/:id`, `store/orders`, `store/orders/:code`, `store/inventory`, `store/import`, `store/settings`, `rider/deliveries`, `rider/orders/:code`, `rider/location`, `geo/reverse`, `geo/search`.
Errors use a single format: `{ error: { code, message, details } }`.

## Tests

```bash
npm test                                   # unit + service tests (embedded Postgres; resets data)
npm run build && PGLITE_DIR=.data/e2e npx next start -p 3100 &
npm run test:e2e                           # browser acceptance tests (BASE_URL defaults to :3100)
```

The unit tests reset whatever database they run against, so don't point `DATABASE_URL` at real data when running them.

## Integrations that need real credentials before launch

| Integration | Now (demo) | Replace in |
| --- | --- | --- |
| Sign-in (customers, staff, riders) | Signed demo cookie plus `/demo` switcher | `src/lib/server/session.ts`; set `DISABLE_DEMO=1` |
| Payments (UPI or gateway) | Cash on delivery plus a labelled UPI simulator | `src/lib/server/providers/payments.ts` (e.g. Razorpay: server-side order creation plus signature verification) |
| Reverse/forward geocoding | Offline demo geocoder; optional Nominatim | `providers/geocoding.ts` (Google, Mapbox or self-hosted Nominatim; set `GEOCODER_PROVIDER`) |
| Road travel time | 1.35 × straight-line at 18 km/h; optional OSRM | `providers/routing.ts` |
| Map tiles | Public OSM tiles (not for production traffic) | `NEXT_PUBLIC_MAP_TILE_URL` / attribution |
| SMS, WhatsApp or push notifications | Shown on the tracking screen only | `providers/notify.ts` (MSG91, Twilio or FCM) |
| Database | Embedded PGlite | `DATABASE_URL` (Supabase or managed Postgres) |
| Product photography | Fluent 3D food renders (MIT, Microsoft) in `public/img/p` | `products.image`, set per product |

Keep all keys in server environment variables. None are read by client code except the public map tile URL.

## Credits

Product images: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) 3D assets, MIT licence. All store names, brands, people and addresses are fictional.
