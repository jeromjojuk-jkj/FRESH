// Types shared by API routes and clients (web today, native apps later).
export type Role = "customer" | "store" | "rider";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "packing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "declined"
  | "cancelled";

export const ORDER_TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Order placed" },
  { status: "accepted", label: "Store accepted" },
  { status: "packing", label: "Packing" },
  { status: "ready", label: "Ready for pickup" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  accepted: "Store accepted",
  packing: "Packing",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  declined: "Declined by store",
  cancelled: "Cancelled",
};

export type SubstitutionPref = "contact" | "remove";
export type PaymentMethod = "cod" | "upi_demo";

export type DeliveryAddress = {
  lat: number;
  lng: number;
  line: string; // street / area (from geocoder or typed)
  flat?: string;
  floor?: string;
  landmark?: string;
  instructions?: string;
  label?: string;
  phone?: string; // for the rider to call; optional
};

export type StoreSummary = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  distanceM: number;
  distanceLabel: string;
  eligible: boolean;
  open: boolean;
  acceptingOrders: boolean;
  atCapacity: boolean;
  hoursLabel: string;
  reason?: string;
  etaMin: number;
  etaMax: number;
  deliveryFee: number;
  freeDeliveryAbove: number;
};

export type CatalogueProduct = {
  productId: string;
  groupKey: string;
  name: string;
  brand: string;
  category: string;
  packLabel: string;
  image: string;
  price: number;
  mrp: number;
  stock: number;
  inStock: boolean;
  popular?: boolean;
};

export type CartLine = { productId: string; qty: number };

export type QuoteLine = {
  productId: string;
  name: string;
  packLabel: string;
  image: string;
  qty: number;
  price: number;
  lineTotal: number;
  available: boolean;
  stock: number;
  issue?: string;
};

export type Quote = {
  storeId: string;
  storeName: string;
  lines: QuoteLine[];
  subtotal: number;
  deliveryFee: number;
  freeDeliveryAbove: number;
  handlingFee: number;
  total: number;
  itemCount: number;
  problems: string[];
  etaMin: number;
  etaMax: number;
};

export const CATEGORIES: { slug: string; name: string; image: string }[] = [
  { slug: "fruits-vegetables", name: "Fruits & Vegetables", image: "/img/p/tomato.webp" },
  { slug: "dairy-eggs", name: "Dairy & Eggs", image: "/img/p/milk.webp" },
  { slug: "rice-grains", name: "Rice & Grains", image: "/img/p/rice.webp" },
  { slug: "snacks", name: "Snacks", image: "/img/p/chips.webp" },
  { slug: "drinks", name: "Drinks", image: "/img/p/juice.webp" },
  { slug: "household", name: "Household", image: "/img/p/sponge.webp" },
  { slug: "personal-care", name: "Personal Care", image: "/img/p/toothbrush.webp" },
];
