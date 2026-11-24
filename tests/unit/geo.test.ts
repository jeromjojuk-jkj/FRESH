import { describe, expect, it } from "vitest";
import { destinationPoint, distanceMeters, isWithinServiceRadius } from "@/lib/geo";
import { query } from "@/lib/server/db";
import { nearbyStores } from "@/lib/server/stores";
import { DEMO_STORES, SAMPLE_ADDRESSES } from "@/lib/demo-data";

const dailyNeeds = DEMO_STORES.find((s) => s.id === "dailyneeds")!;

describe("3 km service radius", () => {
  it("includes a store exactly 3.00 km away and excludes one 3.01 km away", () => {
    for (const bearing of [0, 45, 90, 180, 271]) {
      const at300 = destinationPoint(dailyNeeds, bearing, 3000);
      const at301 = destinationPoint(dailyNeeds, bearing, 3010);
      expect(Math.abs(distanceMeters(dailyNeeds, at300) - 3000)).toBeLessThan(0.01);
      expect(isWithinServiceRadius(distanceMeters(dailyNeeds, at300))).toBe(true);
      expect(isWithinServiceRadius(distanceMeters(dailyNeeds, at301))).toBe(false);
    }
    expect(isWithinServiceRadius(3000.4)).toBe(true);
    expect(isWithinServiceRadius(3001)).toBe(false);
  });

  it("server store search applies the rule (3.00 eligible, 3.01 excluded)", async () => {
    const at300 = destinationPoint(dailyNeeds, 180, 3000);
    const at301 = destinationPoint(dailyNeeds, 180, 3010);
    const a = (await nearbyStores(query, at300)).find((s) => s.id === "dailyneeds")!;
    const b = (await nearbyStores(query, at301)).find((s) => s.id === "dailyneeds")!;
    expect(a.distanceLabel).toBe("3.00 km");
    expect(a.eligible).toBe(true);
    expect(b.distanceLabel).toBe("3.01 km");
    expect(b.eligible).toBe(false);
    expect(b.reason).toMatch(/outside the 3 km/);
  });

  it("sample addresses: one served by several stores, one outside the area", async () => {
    const multi = SAMPLE_ADDRESSES.find((a) => a.id === "koramangala")!;
    const out = SAMPLE_ADDRESSES.find((a) => a.id === "whitefield")!;
    expect((await nearbyStores(query, multi)).filter((s) => s.distanceM <= 3000).length).toBeGreaterThanOrEqual(2);
    expect((await nearbyStores(query, out)).filter((s) => s.distanceM <= 3000).length).toBe(0);
  });
});
