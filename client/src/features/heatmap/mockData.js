// Mock footfall data. Replace with the real heatmap API later (same shape: {x, y, w, zone}).
const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const gauss = (r) => (r() + r() + r() + r() - 2) / 2;

export const ZONES = [
  { id: "entrance", name: "Entrance", x: 0.12, y: 0.8, r: 0.07, base: 1.0, peak: 11 },
  { id: "promo", name: "Promo aisle", x: 0.34, y: 0.5, r: 0.06, base: 0.9, peak: 13 },
  { id: "electronics", name: "Electronics", x: 0.7, y: 0.25, r: 0.08, base: 0.7, peak: 17 },
  { id: "apparel", name: "Apparel", x: 0.3, y: 0.2, r: 0.08, base: 0.6, peak: 15 },
  { id: "grocery", name: "Grocery", x: 0.62, y: 0.58, r: 0.09, base: 0.85, peak: 18 },
  { id: "checkout", name: "Checkout", x: 0.86, y: 0.82, r: 0.06, base: 0.95, peak: 19 },
];

export const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 9:00 to 21:00

export function makeMockData() {
  const r = rng(42);
  const points = [];
  HOURS.forEach((h) => {
    ZONES.forEach((z) => {
      const load = z.base * (0.3 + Math.exp(-((h - z.peak) ** 2) / 9));
      const n = Math.round(load * 70);
      for (let i = 0; i < n; i++) {
        points.push({
          hour: h,
          zone: z.id,
          x: Math.min(0.98, Math.max(0.02, z.x + gauss(r) * z.r)),
          y: Math.min(0.98, Math.max(0.02, z.y + gauss(r) * z.r)),
          w: 0.5 + r() * 0.5,
        });
      }
    });
  });
  return points;
}