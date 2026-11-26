// PostgreSQL schema. Idempotent; runs on boot. Money in integer paise.
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  open_time TEXT NOT NULL DEFAULT '07:00',   -- HH:MM, Asia/Kolkata
  close_time TEXT NOT NULL DEFAULT '22:00',  -- '24:00' = midnight
  prep_minutes INT NOT NULL DEFAULT 8,
  accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
  max_active_orders INT NOT NULL DEFAULT 12,
  delivery_fee INT NOT NULL DEFAULT 2500,
  free_delivery_above INT NOT NULL DEFAULT 19900
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  group_key TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  pack_label TEXT NOT NULL,
  barcode TEXT,                       -- TEXT keeps leading zeros
  image TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  created_by_store TEXT REFERENCES stores(id)
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS popular BOOLEAN NOT NULL DEFAULT FALSE; -- store bestseller badge
CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_uq ON products(barcode) WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS store_products (
  id SERIAL PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  price INT NOT NULL CHECK (price >= 0),
  mrp INT NOT NULL CHECK (mrp >= 0),
  stock INT NOT NULL CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS riders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  home_store_id TEXT REFERENCES stores(id),
  sharing BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS rider_locations (
  rider_id TEXT PRIMARY KEY REFERENCES riders(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  rider_id TEXT REFERENCES riders(id),
  status TEXT NOT NULL,
  address JSONB NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  distance_m INT NOT NULL,
  substitution_pref TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  payment_ref TEXT,
  subtotal INT NOT NULL,
  delivery_fee INT NOT NULL,
  handling_fee INT NOT NULL,
  total INT NOT NULL,
  eta_min_at TIMESTAMPTZ NOT NULL,
  eta_max_at TIMESTAMPTZ NOT NULL,
  eta_revised BOOLEAN NOT NULL DEFAULT FALSE,
  eta_note TEXT,
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  packing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_store_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS orders_customer ON orders(customer_id);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  pack_label TEXT NOT NULL,
  image TEXT NOT NULL,
  price INT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  packed_qty INT NOT NULL DEFAULT 0,
  removed_qty INT NOT NULL DEFAULT 0,  -- units dropped because they were unavailable
  -- pending | packed | short (missing, waiting for customer) | removed | replaced
  status TEXT NOT NULL DEFAULT 'pending',
  replaces_item_id INT REFERENCES order_items(id)
);

CREATE TABLE IF NOT EXISTS order_events (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL,          -- status | notice | eta
  message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_events_order ON order_events(order_id);
`;

// ---- Quick-commerce features: membership, coupons, tips, fees, cancellations, ratings, support ----
export const SCHEMA_V2_SQL = /* sql */ `
ALTER TABLE customers ADD COLUMN IF NOT EXISTS plus_until TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS plus_auto_renew BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS small_cart_fee INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS plus_applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_note TEXT;

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL,              -- pct | flat | freedelivery
  value INT NOT NULL,              -- percent for pct, paise for flat
  max_discount INT,                -- paise cap for pct
  min_order INT NOT NULL DEFAULT 0,
  category TEXT,                   -- pct/flat on one category's items only
  first_order_only BOOLEAN NOT NULL DEFAULT FALSE,
  plus_only BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO coupons (code,title,description,kind,value,max_discount,min_order,category,first_order_only,plus_only) VALUES
 ('WELCOME50','50% off your first order','Up to ₹75 off on your first KripFresh order of ₹149 or more.','pct',50,7500,14900,NULL,TRUE,FALSE),
 ('SAVE30','Flat ₹30 off','On orders of ₹299 or more.','flat',3000,NULL,29900,NULL,FALSE,FALSE),
 ('FREEDEL','Free delivery','No delivery fee on orders of ₹99 or more.','freedelivery',0,NULL,9900,NULL,FALSE,FALSE),
 ('VEGGIE10','10% off fruits & vegetables','Up to ₹40 off the fruits and vegetables in your cart.','pct',10,4000,0,'fruits-vegetables',FALSE,FALSE),
 ('PLUS20','Plus: 20% off','Up to ₹60 off on ₹199 or more, for KripFresh Plus members.','pct',20,6000,19900,NULL,FALSE,TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  kind TEXT NOT NULL,              -- missing | damaged | wrong | quality | late | other
  items JSONB NOT NULL DEFAULT '[]',
  note TEXT,
  status TEXT NOT NULL,            -- refund_approved | in_review | resolved
  refund_amount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
