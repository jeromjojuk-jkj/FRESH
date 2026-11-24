// Fictional demo geography in south-east Bengaluru. Coordinates are illustrative.
import { destinationPoint } from "./geo";

export const DEMO_STORES = [
  { id: "greenleaf", name: "Greenleaf Fresh Mart", area: "Koramangala 5th Block", address: "14, 80 Feet Rd, Koramangala 5th Block", phone: "+91 80000 11111", lat: 12.9352, lng: 77.6245, open: "00:00", close: "24:00", prep: 7, fee: 2500, freeAbove: 19900 },
  { id: "annapurna", name: "Annapurna Supermarket", area: "HSR Layout Sector 3", address: "27th Main, HSR Layout Sector 3", phone: "+91 80000 22222", lat: 12.9116, lng: 77.6474, open: "00:00", close: "24:00", prep: 10, fee: 2000, freeAbove: 24900 },
  { id: "dailyneeds", name: "Daily Needs Bazaar", area: "Indiranagar", address: "100 Feet Rd, HAL 2nd Stage, Indiranagar", phone: "+91 80000 33333", lat: 12.9719, lng: 77.6412, open: "00:00", close: "24:00", prep: 9, fee: 3000, freeAbove: 29900 },
] as const;

const dailyNeeds = { lat: 12.9719, lng: 77.6412 };
// Exactly 3.00 km due south of Daily Needs Bazaar: the boundary case.
const boundary = destinationPoint(dailyNeeds, 180, 3000);

export type SampleAddress = { id: string; title: string; line: string; lat: number; lng: number; note: string };

export const SAMPLE_ADDRESSES: SampleAddress[] = [
  { id: "koramangala", title: "Koramangala 1st Block", line: "Jyoti Nivas College Rd, Koramangala 1st Block, Bengaluru 560034", lat: 12.9234, lng: 77.636, note: "Served by 2 stores" },
  { id: "ejipura", title: "Ejipura (3.00 km edge)", line: "Ejipura Main Rd, Ejipura, Bengaluru 560047", lat: boundary.lat, lng: boundary.lng, note: "Daily Needs Bazaar is exactly 3.00 km away" },
  { id: "whitefield", title: "Whitefield", line: "ITPL Main Rd, Whitefield, Bengaluru 560066", lat: 12.9698, lng: 77.75, note: "Outside the service area" },
];

/** Localities used by the demo reverse/forward geocoder. */
export const DEMO_LOCALITIES = [
  { name: "Koramangala 1st Block", pin: "560034", lat: 12.9234, lng: 77.636 },
  { name: "Koramangala 5th Block", pin: "560095", lat: 12.9352, lng: 77.6245 },
  { name: "HSR Layout Sector 3", pin: "560102", lat: 12.9116, lng: 77.6474 },
  { name: "Ejipura", pin: "560047", lat: 12.9449, lng: 77.6312 },
  { name: "Indiranagar", pin: "560038", lat: 12.9719, lng: 77.6412 },
  { name: "Domlur", pin: "560071", lat: 12.961, lng: 77.6387 },
  { name: "BTM Layout", pin: "560076", lat: 12.9166, lng: 77.6101 },
  { name: "Whitefield", pin: "560066", lat: 12.9698, lng: 77.75 },
];
