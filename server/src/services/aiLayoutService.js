import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import POSTransaction from "../models/POSTransaction.js";
import POSUpload from "../models/POSUpload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard store zones used across HeatVision
export const DEFAULT_STORE_ZONES = [
  { id: "entrance", name: "Entrance", category: "General", x: 0.12, y: 0.8 },
  { id: "promo", name: "Promo Aisle", category: "Promotional", x: 0.34, y: 0.5 },
  { id: "electronics", name: "Electronics", category: "Electronics", x: 0.7, y: 0.25 },
  { id: "apparel", name: "Apparel", category: "Apparel", x: 0.3, y: 0.2 },
  { id: "grocery", name: "Grocery", category: "Grocery", x: 0.62, y: 0.58 },
  { id: "checkout", name: "Checkout", category: "POS", x: 0.86, y: 0.82 },
];

/**
 * Normalizes zone IDs across different formats (e.g., "Zone A" -> "apparel", "zone_apparel" -> "apparel")
 */
export function normalizeZoneId(rawZoneId) {
  if (!rawZoneId) return "apparel";
  const s = String(rawZoneId).trim().toLowerCase();
  
  if (s.includes("entrance")) return "entrance";
  if (s.includes("promo")) return "promo";
  if (s.includes("electronic")) return "electronics";
  if (s.includes("apparel") || s === "zone a" || s === "zone_a") return "apparel";
  if (s.includes("grocer") || s === "zone c" || s === "zone_c") return "grocery";
  if (s.includes("checkout") || s.includes("billing") || s.includes("pos")) return "checkout";
  if (s === "zone b" || s === "zone_b") return "electronics";
  if (s === "shelf 1" || s === "shelf") return "apparel";
  
  return s.replace(/^zone[_-]/, "");
}

/**
 * Reads zone analytics produced by CV processing pipeline or latest heatmap
 */
export function getLatestCvZoneAnalytics() {
  const processedDir = path.resolve(__dirname, "../../../data/processed");
  const distFile = path.resolve(__dirname, "../../../client/dist/zone_analytics.json");
  const publicFile = path.resolve(__dirname, "../../../client/public/zone_analytics.json");

  // Check client dist/public or processed data
  const candidates = [
    path.join(processedDir, "zone_analytics.json"),
    distFile,
    publicFile,
  ];

  for (const f of candidates) {
    if (fs.existsSync(f)) {
      try {
        const data = JSON.parse(fs.readFileSync(f, "utf-8"));
        if (data && (data.zones || data.total_visitors)) {
          return data;
        }
      } catch (err) {
        console.warn(`[aiLayoutService] Error reading ${f}:`, err.message);
      }
    }
  }

  // Fallback default zone metrics
  return {
    total_visitors: 1248,
    zones: DEFAULT_STORE_ZONES.map((z, idx) => ({
      id: z.id,
      zone_id: z.id,
      name: z.name,
      category: z.category,
      traffic_count: [1420, 520, 680, 890, 740, 610][idx] || 300,
      footfall_count: [1420, 520, 680, 890, 740, 610][idx] || 300,
      avg_dwell_seconds: [24, 38, 72, 85, 45, 95][idx] || 40,
      dwell: `${([0.4, 0.6, 1.2, 1.4, 0.75, 1.5][idx] || 1).toFixed(1)} min`,
      traffic_share_pct: [29, 10, 14, 18, 15, 12][idx] || 16,
    })),
  };
}

/**
 * Aggregates POS sales transactions from MongoDB per zone
 */
export async function getAggregatedZoneSales(storeId = null) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  const query = storeId ? { storeId } : {};

  try {
    const records = await POSTransaction.find(query).lean();
    if (!records || records.length === 0) {
      return null;
    }

    const zoneSales = {};

    for (const tx of records) {
      const zid = normalizeZoneId(tx.zoneId);
      if (!zoneSales[zid]) {
        zoneSales[zid] = {
          zone_id: zid,
          total_revenue: 0,
          transaction_count: 0,
          total_items_sold: 0,
          categories: new Set(),
        };
      }

      zoneSales[zid].total_revenue += Number(tx.totalAmount) || 0;
      zoneSales[zid].transaction_count += 1;
      zoneSales[zid].total_items_sold += Number(tx.quantity) || 1;
      if (tx.productCategory) {
        zoneSales[zid].categories.add(tx.productCategory);
      }
    }

    for (const zid of Object.keys(zoneSales)) {
      zoneSales[zid].total_revenue = Math.round(zoneSales[zid].total_revenue * 100) / 100;
      zoneSales[zid].avg_ticket_value = Math.round(
        (zoneSales[zid].total_revenue / Math.max(1, zoneSales[zid].transaction_count)) * 100
      ) / 100;
      zoneSales[zid].categories = Array.from(zoneSales[zid].categories);
    }

    return zoneSales;
  } catch (err) {
    console.warn("[aiLayoutService] Could not aggregate from DB:", err.message);
    return null;
  }
}

/**
 * Issue #36: Footfall-to-sales correlation and conversion engine
 */
export function computeSalesConversion(zoneAnalytics, zoneSalesMap) {
  const rawZones = zoneAnalytics.zones || [];
  const totalStoreFootfall = zoneAnalytics.total_visitors || 
    rawZones.reduce((sum, z) => sum + (z.traffic_count || z.footfall_count || 0), 0) || 1;

  // Use provided sales map or standard baseline sales
  const salesMap = zoneSalesMap || {
    entrance: { total_revenue: 2840, transaction_count: 85, avg_ticket_value: 33.4 },
    promo: { total_revenue: 6760, transaction_count: 140, avg_ticket_value: 48.3 },
    electronics: { total_revenue: 42500, transaction_count: 180, avg_ticket_value: 236.1 },
    apparel: { total_revenue: 31200, transaction_count: 260, avg_ticket_value: 120.0 },
    grocery: { total_revenue: 14800, transaction_count: 310, avg_ticket_value: 47.7 },
    checkout: { total_revenue: 8900, transaction_count: 350, avg_ticket_value: 25.4 },
  };

  const results = [];

  // Map known zones or fallback to DEFAULT_STORE_ZONES
  const zoneList = rawZones.length > 0 ? rawZones : DEFAULT_STORE_ZONES;

  for (const z of zoneList) {
    const zid = normalizeZoneId(z.id || z.zone_id);
    const footfall = z.traffic_count || z.footfall_count || 100;
    const dwellSeconds = z.avg_dwell_seconds || (z.dwell_minutes ? z.dwell_minutes * 60 : 45);

    const sales = salesMap[zid] || salesMap[z.id] || {
      total_revenue: Math.round(footfall * 18.5),
      transaction_count: Math.max(1, Math.round(footfall * 0.18)),
      avg_ticket_value: 45.0,
    };

    const txCount = sales.transaction_count || 0;
    const revenue = Math.round(sales.total_revenue * 100) / 100;
    const conversionRate = Math.round((txCount / Math.max(1, footfall)) * 1000) / 10;
    const revenuePerShopper = Math.round((revenue / Math.max(1, footfall)) * 100) / 100;
    const trafficSharePct = Math.round((footfall / totalStoreFootfall) * 1000) / 10;

    const matchedDefault = DEFAULT_STORE_ZONES.find((dz) => dz.id === zid);

    results.push({
      zone_id: zid,
      name: z.name || matchedDefault?.name || zid.toUpperCase(),
      category: z.category || matchedDefault?.category || "Retail",
      footfall_count: footfall,
      avg_dwell_seconds: dwellSeconds,
      dwell_minutes: Math.round((dwellSeconds / 60) * 10) / 10,
      traffic_share_pct: trafficSharePct,
      transactions: txCount,
      total_revenue: revenue,
      conversion_rate_pct: conversionRate,
      revenue_per_shopper: revenuePerShopper,
      avg_ticket_value: sales.avg_ticket_value || Math.round((revenue / Math.max(1, txCount)) * 100) / 100,
    });
  }

  return results;
}

/**
 * Issue #37: Lost Sales Detection Heuristic Algorithm
 * 
 * Flags areas with high shopper engagement/dwell time but disproportionately low conversion.
 */
export function detectLostSales(conversionResults) {
  const lostSalesAlerts = [];
  let totalEstimatedLostValue = 0;

  for (const item of conversionResults) {
    const { zone_id, name, footfall_count, avg_dwell_seconds, conversion_rate_pct, category, avg_ticket_value } = item;

    // Skip checkout payment counter
    if (category === "POS" || zone_id === "checkout") continue;

    // Lost Sales Heuristics:
    // 1. Dwell engagement is high (> 30s) but conversion is below healthy benchmark (15%)
    // 2. High footfall but disproportionately low ticket throughput
    const benchmarkConversion = 16.0;

    if (footfall_count >= 15 && avg_dwell_seconds >= 30 && conversion_rate_pct < benchmarkConversion) {
      const expectedTx = Math.round(footfall_count * (benchmarkConversion / 100));
      const lostTx = Math.max(1, expectedTx - item.transactions);
      const ticketVal = avg_ticket_value > 0 ? avg_ticket_value : 50.0;
      const lostRevenue = Math.round(lostTx * ticketVal);

      totalEstimatedLostValue += lostRevenue;

      const isHighPriority = lostRevenue > 5000 || conversion_rate_pct < 6.0 || avg_dwell_seconds > 60;

      let reason = `High dwell time (${Math.round(avg_dwell_seconds)}s) but low sales conversion (${conversion_rate_pct}%).`;
      if (conversion_rate_pct < 5.0) {
        reason = "Visitors spend significant time here, but purchases remain critically below average.";
      } else if (avg_dwell_seconds > 70) {
        reason = "Long browsing time without checkout indicates possible product search difficulty or stock availability issues.";
      }

      lostSalesAlerts.push({
        id: `lost-${zone_id}`,
        zone_id,
        zone: name,
        priority: isHighPriority ? "High" : "Medium",
        reason,
        value: `₹${lostRevenue.toLocaleString()}`,
        numericValue: lostRevenue,
        label: "Lost opportunity",
        footfall: footfall_count,
        dwellSeconds: avg_dwell_seconds,
        actualConversion: conversion_rate_pct,
        benchmarkConversion,
      });
    }
  }

  // Sort by highest lost revenue first
  lostSalesAlerts.sort((a, b) => b.numericValue - a.numericValue);

  return {
    title: "Lost Sales Opportunities",
    subtitle: "Areas where potential revenue may be lost due to low conversion or dead-zone friction",
    totalLostValue: `₹${totalEstimatedLostValue.toLocaleString()}`,
    totalLostNumeric: totalEstimatedLostValue,
    zones: lostSalesAlerts,
  };
}

/**
 * Issue #38: Rule-Based AI Store Layout Optimization Engine
 * 
 * Generates explainable, actionable recommendations to maximize floorplan revenue.
 */
export function generateLayoutRecommendations(conversionResults, lostSalesData) {
  const recommendations = [];

  // 1. Recommendations from lost sales opportunities
  for (const alert of (lostSalesData.zones || []).slice(0, 2)) {
    recommendations.push({
      id: `rec-lost-${alert.zone_id}`,
      type: "Opportunity",
      badgeClass: "purple",
      title: `High traffic, low conversion in ${alert.zone}`,
      description: alert.reason || `Shoppers dwell in ${alert.zone} but convert at only ${alert.actualConversion}%.`,
      impact: `+${Math.round(alert.benchmarkConversion - alert.actualConversion)}% potential conversion (${alert.value})`,
      icon: "ArrowUpRight",
      iconTheme: "teal",
      zone_id: alert.zone_id,
      action: `Relocate high-margin impulse items into '${alert.zone}' and improve product visibility/pricing labels.`,
    });
  }

  // 2. Identify top converting zone for capacity expansion
  const sortedByConv = [...conversionResults].sort((a, b) => b.conversion_rate_pct - a.conversion_rate_pct);
  if (sortedByConv.length > 0) {
    const topZone = sortedByConv[0];
    recommendations.push({
      id: `rec-expand-${topZone.zone_id}`,
      type: "Recommendation",
      badgeClass: "purple",
      title: `Expand high-converting capacity in ${topZone.name}`,
      description: `${topZone.name} delivers store-leading ${topZone.conversion_rate_pct}% conversion rate with ₹${topZone.revenue_per_shopper} revenue per visitor.`,
      impact: "Potential revenue increase",
      icon: "Store",
      iconTheme: "purple",
      zone_id: topZone.zone_id,
      action: `Increase display facing & shelf inventory in '${topZone.name}' to maximize conversion yield.`,
    });
  }

  // 3. Dead Zone or Ignored Display detection (zones with < 10% traffic share)
  const deadZones = conversionResults.filter(
    (z) => z.traffic_share_pct < 10.0 && z.category !== "POS"
  );
  if (deadZones.length > 0) {
    const deadZone = deadZones[0];
    recommendations.push({
      id: `rec-dead-${deadZone.zone_id}`,
      type: "Layout Optimization",
      badgeClass: "purple",
      title: `Underutilized display reach in ${deadZone.name}`,
      description: `Only ${deadZone.traffic_share_pct}% of total visitors traverse this section. Shoppers bypass this display.`,
      impact: "Reclaim lost floor area",
      icon: "ArrowUpRight",
      iconTheme: "teal",
      zone_id: deadZone.zone_id,
      action: `Adjust aisle bottleneck layout and install directional promotional endcaps to route traffic into '${deadZone.name}'.`,
    });
  }

  return recommendations;
}

/**
 * Issue #39: Composite Store Floorplan Layout Efficiency Score (0 to 100)
 * 
 * Calculated from:
 * 1. Average Conversion Performance Score (40% weight)
 * 2. Spatial Traffic Distribution Balance Score (30% weight)
 * 3. Shopper Engagement Dwell Score (30% weight)
 */
export function computeLayoutEfficiencyScore(conversionResults) {
  if (!conversionResults || conversionResults.length === 0) {
    return {
      compositeScore: 78.5,
      grade: "A",
      subScores: {
        conversionPerformance: 76.0,
        trafficDistributionBalance: 82.0,
        shopperEngagement: 80.0,
      },
    };
  }

  // 1. Conversion Score (benchmark = 20% healthy conversion rate)
  const convRates = conversionResults.map((r) => r.conversion_rate_pct);
  const avgConv = convRates.reduce((a, b) => a + b, 0) / convRates.length;
  const conversionScore = Math.min(100, Math.max(0, (avgConv / 20.0) * 100));

  // 2. Traffic Balance Score (standard deviation across zones; balanced store has lower std dev)
  const trafficShares = conversionResults.map((r) => r.traffic_share_pct);
  const meanShare = trafficShares.reduce((a, b) => a + b, 0) / trafficShares.length;
  const variance = trafficShares.reduce((sum, val) => sum + Math.pow(val - meanShare, 2), 0) / trafficShares.length;
  const stdDev = Math.sqrt(variance);
  const balanceScore = Math.min(100, Math.max(20, 100 - (stdDev * 2.8)));

  // 3. Shopper Engagement Score (benchmark = 60s average dwell)
  const dwells = conversionResults.map((r) => r.avg_dwell_seconds);
  const avgDwell = dwells.reduce((a, b) => a + b, 0) / dwells.length;
  const engagementScore = Math.min(100, Math.max(20, (avgDwell / 60.0) * 100));

  // Composite weighted calculation
  const composite = Math.round(
    ((conversionScore * 0.40) + (balanceScore * 0.30) + (engagementScore * 0.30)) * 10
  ) / 10;

  let grade = "C";
  if (composite >= 85) grade = "A+";
  else if (composite >= 75) grade = "A";
  else if (composite >= 60) grade = "B";
  else if (composite >= 45) grade = "C";
  else grade = "D";

  return {
    compositeScore: composite,
    grade,
    subScores: {
      conversionPerformance: Math.round(conversionScore * 10) / 10,
      trafficDistributionBalance: Math.round(balanceScore * 10) / 10,
      shopperEngagement: Math.round(engagementScore * 10) / 10,
    },
    metricsSummary: {
      averageConversionRate: `${Math.round(avgConv * 10) / 10}%`,
      averageDwellTime: `${Math.round(avgDwell)}s`,
      trafficBalanceIndex: `${Math.round(balanceScore)}/100`,
    },
  };
}

/**
 * High-level service method to compile all AI Insights
 */
export async function getFullAIInsights(storeId = null) {
  const zoneAnalytics = getLatestCvZoneAnalytics();
  const zoneSalesMap = await getAggregatedZoneSales(storeId);
  const conversionResults = computeSalesConversion(zoneAnalytics, zoneSalesMap);
  const lostSales = detectLostSales(conversionResults);
  const recommendations = generateLayoutRecommendations(conversionResults, lostSales);
  const score = computeLayoutEfficiencyScore(conversionResults);

  return {
    header: {
      title: "AI Layout Insights",
      subtitle: "Smart layout, lost sales & merchandising recommendations from store activity",
    },
    efficiencyScore: score,
    insights: recommendations,
    lostSales,
    zoneConversion: conversionResults,
  };
}
