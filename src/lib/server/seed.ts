import type { Q } from "./db";
import { DEMO_STORES } from "../demo-data";

// [id, group, name, brand, category, pack, barcode, image, basePriceRupees, mrpRupees, tags]
type P = [string, string, string, string, string, string, string, string, number, number, string];

export const DEMO_PRODUCTS: P[] = [
  // Fruits & Vegetables
  ["tomato-500g", "tomato", "Tomato (Hybrid)", "Farm fresh", "fruits-vegetables", "500 g", "0200000000011", "tomato", 24, 30, "tamatar tomatoes தக்காளி"],
  ["tomato-1kg", "tomato", "Tomato (Hybrid)", "Farm fresh", "fruits-vegetables", "1 kg", "0200000000028", "tomato", 45, 56, "tamatar tomatoes தக்காளி"],
  ["onion-1kg", "onion", "Onion", "Farm fresh", "fruits-vegetables", "1 kg", "0200000000035", "onion", 38, 48, "pyaz kanda onions வெங்காயம்"],
  ["potato-1kg", "potato", "Potato", "Farm fresh", "fruits-vegetables", "1 kg", "0200000000042", "potato", 34, 42, "aloo batata potatoes உருளைக்கிழங்கு"],
  ["banana-6", "banana", "Banana Robusta", "Farm fresh", "fruits-vegetables", "6 pcs", "0200000000059", "banana", 42, 50, "kela bananas fruit வாழைப்பழம்"],
  ["apple-4", "apple", "Shimla Apple", "Farm fresh", "fruits-vegetables", "4 pcs (approx. 550 g)", "0200000000066", "apple", 129, 160, "seb apples fruit"],
  ["carrot-500g", "carrot", "Carrot (Ooty)", "Farm fresh", "fruits-vegetables", "500 g", "0200000000073", "carrot", 32, 40, "gajar carrots கேரட்"],
  ["cucumber-500g", "cucumber", "Cucumber", "Farm fresh", "fruits-vegetables", "500 g", "0200000000080", "cucumber", 25, 32, "kheera kakdi"],
  ["chilli-100g", "chilli", "Green Chilli", "Farm fresh", "fruits-vegetables", "100 g", "0200000000097", "chilli", 9, 12, "hari mirch chili மிளகாய்"],
  ["lemon-4", "lemon", "Lemon", "Farm fresh", "fruits-vegetables", "4 pcs", "0200000000103", "lemon", 20, 25, "nimbu lime எலுமிச்சை"],
  ["mango-1kg", "mango", "Alphonso Mango", "Farm fresh", "fruits-vegetables", "1 kg (3–4 pcs)", "0200000000110", "mango", 299, 360, "aam hapus mangoes fruit"],
  ["garlic-200g", "garlic", "Garlic", "Farm fresh", "fruits-vegetables", "200 g", "0200000000127", "garlic", 48, 60, "lahsun"],
  ["coriander-100g", "coriander", "Coriander Leaves", "Farm fresh", "fruits-vegetables", "1 bunch (100 g)", "0200000000134", "coriander", 12, 15, "dhania cilantro"],
  ["ginger-200g", "ginger", "Ginger", "Farm fresh", "fruits-vegetables", "200 g", "0200000000141", "ginger", 30, 38, "adrak"],
  ["spinach-250g", "spinach", "Spinach (Palak)", "Farm fresh", "fruits-vegetables", "250 g", "0200000000158", "spinach", 22, 28, "palak greens"],
  ["brinjal-500g", "brinjal", "Brinjal (Purple)", "Farm fresh", "fruits-vegetables", "500 g", "0200000000165", "brinjal", 30, 38, "baingan eggplant"],
  ["grapes-500g", "grapes", "Green Grapes", "Farm fresh", "fruits-vegetables", "500 g", "0200000000172", "grapes", 79, 99, "angoor fruit"],
  // Dairy & Eggs
  ["milk-toned-500", "milk-toned", "Toned Milk", "Nandini Valley", "dairy-eggs", "500 ml", "8900000000017", "milk", 27, 27, "doodh dudh milk toned பால்"],
  ["milk-toned-1l", "milk-toned", "Toned Milk", "Nandini Valley", "dairy-eggs", "1 L", "8900000000024", "milk", 52, 52, "doodh dudh milk toned பால்"],
  ["milk-full-500", "milk-full", "Full Cream Milk", "Nandini Valley", "dairy-eggs", "500 ml", "8900000000031", "milk", 33, 33, "doodh dudh milk full cream பால்"],
  ["milk-full-1l", "milk-full", "Full Cream Milk", "Nandini Valley", "dairy-eggs", "1 L", "8900000000048", "milk", 64, 64, "doodh dudh milk full cream பால்"],
  ["curd-400g", "curd", "Fresh Curd", "Nandini Valley", "dairy-eggs", "400 g", "8900000000055", "curd", 35, 38, "dahi yogurt yoghurt தயிர்"],
  ["paneer-200g", "paneer", "Malai Paneer", "Gokul Farms", "dairy-eggs", "200 g", "8900000000062", "paneer", 90, 100, "cottage cheese"],
  ["butter-100g", "butter", "Salted Butter", "Gokul Farms", "dairy-eggs", "100 g", "8900000000079", "butter", 58, 60, "makhan"],
  ["butter-500g", "butter", "Salted Butter", "Gokul Farms", "dairy-eggs", "500 g", "8900000000086", "butter", 275, 285, "makhan"],
  ["eggs-6", "eggs", "Farm Eggs", "Happy Hens", "dairy-eggs", "6 pcs", "8900000000093", "eggs", 48, 54, "anda egg முட்டை"],
  ["eggs-12", "eggs", "Farm Eggs", "Happy Hens", "dairy-eggs", "12 pcs", "8900000000109", "eggs", 92, 104, "anda egg முட்டை"],
  ["ghee-500ml", "ghee", "Cow Ghee", "Gokul Farms", "dairy-eggs", "500 ml jar", "8900000000116", "jar", 340, 365, "ghee clarified butter நெய்"],
  // Rice & Grains
  ["rice-sona-1kg", "rice-sona", "Sona Masoori Rice", "Golden Harvest", "rice-grains", "1 kg", "0890000000014", "rice", 72, 85, "chawal rice raw அரிசி"],
  ["rice-sona-5kg", "rice-sona", "Sona Masoori Rice", "Golden Harvest", "rice-grains", "5 kg", "0890000000021", "rice", 345, 410, "chawal rice raw அரிசி"],
  ["rice-basmati-1kg", "rice-basmati", "Basmati Rice", "Golden Harvest", "rice-grains", "1 kg", "0890000000038", "rice", 145, 180, "chawal biryani basmati அரிசி"],
  ["atta-5kg", "atta", "Whole Wheat Atta", "Chakki Gold", "rice-grains", "5 kg", "0890000000045", "wheat", 255, 290, "atta flour wheat chapati roti கோதுமை மாவு"],
  ["toor-1kg", "toor", "Toor Dal", "Golden Harvest", "rice-grains", "1 kg", "0890000000052", "dal", 165, 190, "arhar dal lentils pulses பருப்பு"],
  ["moong-500g", "moong", "Moong Dal", "Golden Harvest", "rice-grains", "500 g", "0890000000069", "dal", 72, 85, "dal lentils pulses பருப்பு"],
  ["bread-400g", "bread", "Whole Wheat Bread", "Morning Oven", "rice-grains", "400 g", "0890000000076", "bread", 45, 50, "bread pav loaf"],
  ["salt-1kg", "salt", "Iodised Salt", "Sagar", "rice-grains", "1 kg", "0890000000083", "salt", 26, 28, "namak"],
  ["honey-250g", "honey", "Wild Forest Honey", "Hive & Co", "rice-grains", "250 g", "0890000000090", "honey", 135, 160, "shahad"],
  // Snacks
  ["chips-masala-52g", "chips", "Masala Potato Chips", "Crunchmint", "snacks", "52 g", "0450000000019", "chips", 20, 20, "wafers crisps"],
  ["biscuit-glucose-250g", "biscuit", "Glucose Biscuits", "Teatime", "snacks", "250 g", "0450000000026", "biscuit", 30, 30, "biscuits cookies"],
  ["peanuts-200g", "peanuts", "Roasted Peanuts", "Crunchmint", "snacks", "200 g", "0450000000033", "peanuts", 55, 60, "moongphali groundnut namkeen"],
  ["chocolate-80g", "chocolate", "Dark Chocolate 55%", "Cocoa Lane", "snacks", "80 g", "0450000000040", "chocolate", 99, 110, "chocolate sweets"],
  ["noodles-4pk", "noodles", "Masala Instant Noodles", "Quickbowl", "snacks", "4 × 70 g", "0450000000057", "noodles", 56, 60, "maggi noodles"],
  ["popcorn-100g", "popcorn", "Butter Popcorn", "Crunchmint", "snacks", "100 g", "0450000000064", "popcorn", 40, 45, "popcorn"],
  // Drinks
  ["juice-mango-1l", "juice-mango", "Mango Juice", "Orchard Pure", "drinks", "1 L", "0560000000016", "juice", 110, 120, "juice drink"],
  ["tea-250g", "tea", "Assam Tea Leaves", "Brahmaputra Estates", "drinks", "250 g", "0560000000023", "tea", 145, 160, "chai patti tea டீ"],
  ["coffee-200g", "coffee", "Filter Coffee Powder", "Malnad Roasters", "drinks", "200 g", "0560000000030", "coffee", 160, 180, "coffee filter kaapi காபி"],
  ["coconut-water-200ml", "coconut-water", "Tender Coconut Water", "Orchard Pure", "drinks", "200 ml", "0560000000047", "coconut", 45, 50, "nariyal pani இளநீர்"],
  ["soda-750ml", "soda", "Lime Soda", "Fizzwell", "drinks", "750 ml", "0560000000054", "soda", 40, 40, "soft drink cold drink"],
  ["water-1l", "water", "Packaged Drinking Water", "Aquaclear", "drinks", "1 L", "0560000000061", "water", 20, 20, "bisleri paani water bottle"],
  // Household
  ["dishwash-500ml", "dishwash", "Dishwash Liquid (Lemon)", "Sparkle", "household", "500 ml", "0670000000013", "bottle", 99, 115, "vim utensil cleaner"],
  ["sponge-3pk", "sponge", "Scrub Sponge", "Sparkle", "household", "3 pcs", "0670000000020", "sponge", 45, 50, "scrubber"],
  ["detergent-1kg", "detergent", "Detergent Powder", "Sparkle", "household", "1 kg", "0670000000037", "soap", 125, 140, "washing powder surf"],
  ["tissue-4", "tissue", "Toilet Tissue Rolls", "SoftTouch", "household", "4 rolls", "0670000000044", "tissue", 140, 160, "toilet paper"],
  ["broom-1", "broom", "Soft Grass Broom", "Sparkle", "household", "1 pc", "0670000000051", "broom", 120, 140, "jhadu"],
  ["garbage-bags-30", "garbage-bags", "Garbage Bags (Medium)", "SoftTouch", "household", "30 bags", "0670000000068", "bin", 89, 99, "dustbin bags"],
  // Personal Care
  ["toothpaste-150g", "toothpaste", "Herbal Toothpaste", "Neem & Clove", "personal-care", "150 g", "0780000000010", "toothbrush", 95, 105, "toothpaste dental"],
  ["soap-4x100g", "soap", "Sandal Bath Soap", "Mysore Glow", "personal-care", "4 × 100 g", "0780000000027", "soap", 160, 180, "bathing soap"],
  ["shampoo-180ml", "shampoo", "Hibiscus Shampoo", "Neem & Clove", "personal-care", "180 ml", "0780000000034", "bottle", 145, 165, "hair wash"],
  ["coconut-oil-200ml", "coconut-oil", "Coconut Hair Oil", "Kerala Gold", "personal-care", "200 ml", "0780000000041", "coconut", 95, 105, "hair oil"],
  ["razor-3", "razor", "Disposable Razors", "SmoothEdge", "personal-care", "3 pcs", "0780000000058", "razor", 75, 85, "shaving"],
];

// Deterministic pseudo-random so every reset gives the same demo.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

// Each store prices and stocks differently.
const STORE_RULES: Record<string, { priceFactor: number; skip: string[]; outOfStock: string[] }> = {
  greenleaf: { priceFactor: 1.0, skip: ["broom-1"], outOfStock: ["grapes-500g", "butter-500g"] },
  annapurna: { priceFactor: 0.96, skip: ["mango-1kg", "chocolate-80g", "honey-250g"], outOfStock: ["paneer-200g", "coconut-water-200ml"] },
  dailyneeds: { priceFactor: 1.04, skip: ["brinjal-500g", "garbage-bags-30"], outOfStock: ["eggs-12"] },
};

export async function seedDatabase(q: Q): Promise<void> {
  for (const s of DEMO_STORES) {
    await q(
      `INSERT INTO stores (id,name,area,address,phone,lat,lng,open_time,close_time,prep_minutes,delivery_fee,free_delivery_above)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [s.id, s.name, s.area, s.address, s.phone, s.lat, s.lng, s.open, s.close, s.prep, s.fee, s.freeAbove],
    );
  }
  for (const p of DEMO_PRODUCTS) {
    const [id, group, name, brand, cat, pack, barcode, img, , , tags] = p;
    await q(
      `INSERT INTO products (id,group_key,name,brand,category,pack_label,barcode,image,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, group, name, brand, cat, pack, barcode, `/img/p/${img}.webp`, tags],
    );
  }
  // Store bestsellers (demo data) get the "Popular" badge.
  await q(`UPDATE products SET popular=TRUE WHERE id = ANY($1::text[])`, [["milk-toned-500", "milk-toned-1l", "tomato-500g", "tomato-1kg", "onion-1kg", "banana-6", "rice-sona-5kg", "eggs-6", "curd-400g", "potato-1kg", "bread-400g", "carrot-500g"]]);
  for (const s of DEMO_STORES) {
    const rule = STORE_RULES[s.id];
    for (const p of DEMO_PRODUCTS) {
      const [id, , , , , , , , base, mrp] = p;
      if (rule.skip.includes(id)) continue;
      const jitter = 1 + (hash(s.id + id) - 0.5) * 0.08; // ±4 %
      const price = Math.min(mrp, Math.max(1, Math.round(base * rule.priceFactor * jitter))) * 100;
      const stock = rule.outOfStock.includes(id) ? 0 : 6 + Math.floor(hash(id + s.id) * 40);
      await q(`INSERT INTO store_products (store_id,product_id,price,mrp,stock) VALUES ($1,$2,$3,$4,$5)`, [s.id, id, price, mrp * 100, stock]);
    }
  }
  const customers = [
    ["cust-asha", "Asha Menon", "+91 90000 10001"],
    ["cust-ravi", "Ravi Kumar", "+91 90000 10002"],
  ];
  for (const c of customers) await q(`INSERT INTO customers (id,name,phone) VALUES ($1,$2,$3)`, c);
  const riders = [
    ["rider-imran", "Imran S.", "+91 95000 20001", "Scooter · KA 01 AB 1234", "greenleaf"],
    ["rider-lakshmi", "Lakshmi R.", "+91 95000 20002", "E-bike · KA 51 EV 2211", "annapurna"],
    ["rider-joseph", "Joseph D.", "+91 95000 20003", "Scooter · KA 03 CD 9876", "dailyneeds"],
  ];
  for (const r of riders) await q(`INSERT INTO riders (id,name,phone,vehicle,home_store_id) VALUES ($1,$2,$3,$4,$5)`, r);

  // Past delivered order so Asha (returning customer) sees "Buy again" at Greenleaf.
  const past = [["milk-toned-1l", 2], ["curd-400g", 1], ["bread-400g", 1], ["banana-6", 1], ["eggs-6", 1]] as const;
  const addr = { lat: 12.9234, lng: 77.636, line: "Jyoti Nivas College Rd, Koramangala 1st Block, Bengaluru 560034", flat: "B-204", floor: "2nd", landmark: "Opp. park" };
  let subtotal = 0;
  const lines: { id: string; price: number; qty: number; name: string; pack: string; image: string }[] = [];
  for (const [pid, qty] of past) {
    const { rows } = await q(`SELECT sp.price, p.name, p.pack_label, p.image FROM store_products sp JOIN products p ON p.id=sp.product_id WHERE sp.store_id='greenleaf' AND sp.product_id=$1`, [pid]);
    const r = rows[0];
    subtotal += r.price * qty;
    lines.push({ id: pid, price: r.price, qty, name: r.name, pack: r.pack_label, image: r.image });
  }
  const { rows: o } = await q(
    `INSERT INTO orders (code,idempotency_key,customer_id,store_id,rider_id,status,address,lat,lng,distance_m,substitution_pref,payment_method,payment_status,subtotal,delivery_fee,handling_fee,total,eta_min_at,eta_max_at,created_at,accepted_at,packing_at,ready_at,picked_up_at,delivered_at)
     VALUES ('NB-1001','seed-1','cust-asha','greenleaf','rider-imran','delivered',$1,$2,$3,1810,'contact','cod','paid',$4,0,500,$5,
       now()-interval '3 days', now()-interval '3 days', now()-interval '3 days 20 min', now()-interval '3 days 19 min', now()-interval '3 days 18 min', now()-interval '3 days 12 min', now()-interval '3 days 10 min', now()-interval '3 days')
     RETURNING id`,
    [JSON.stringify(addr), addr.lat, addr.lng, subtotal, subtotal + 500],
  );
  for (const l of lines) {
    await q(`INSERT INTO order_items (order_id,product_id,name,pack_label,image,price,qty,packed_qty,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$7,'packed')`, [o[0].id, l.id, l.name, l.pack, l.image, l.price, l.qty]);
  }
  await q(`INSERT INTO order_events (order_id,kind,message,at) VALUES ($1,'status','Delivered', now()-interval '3 days')`, [o[0].id]);
}
