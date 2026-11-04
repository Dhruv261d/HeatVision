import express from "express";
import {
  getFullAIInsights,
  getLatestCvZoneAnalytics,
  getAggregatedZoneSales,
  computeSalesConversion,
  detectLostSales,
  generateLayoutRecommendations,
  computeLayoutEfficiencyScore,
} from "../services/aiLayoutService.js";

const router = express.Router();

/**
 * GET /api/ai/insights
 * Comprehensive AI Layout Insights, Efficiency Score & Lost Sales Opportunities
 */
router.get("/insights", async (req, res) => {
  try {
    const storeId = req.query.storeId || null;
    const insights = await getFullAIInsights(storeId);
    return res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("[aiRoutes] Error in /insights:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate AI layout insights",
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/conversion
 * Issue #36: Footfall-to-sales correlation and conversion engine
 */
router.get("/conversion", async (req, res) => {
  try {
    const storeId = req.query.storeId || null;
    const zoneAnalytics = getLatestCvZoneAnalytics();
    const zoneSalesMap = await getAggregatedZoneSales(storeId);
    const conversion = computeSalesConversion(zoneAnalytics, zoneSalesMap);

    return res.status(200).json({
      success: true,
      data: conversion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/lost-sales
 * Issue #37: Lost sales detection heuristic algorithm
 */
router.get("/lost-sales", async (req, res) => {
  try {
    const storeId = req.query.storeId || null;
    const zoneAnalytics = getLatestCvZoneAnalytics();
    const zoneSalesMap = await getAggregatedZoneSales(storeId);
    const conversion = computeSalesConversion(zoneAnalytics, zoneSalesMap);
    const lostSales = detectLostSales(conversion);

    return res.status(200).json({
      success: true,
      data: lostSales,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/layout-recommendations
 * Issue #38: Rule-based AI store layout optimization engine
 */
router.get("/layout-recommendations", async (req, res) => {
  try {
    const storeId = req.query.storeId || null;
    const zoneAnalytics = getLatestCvZoneAnalytics();
    const zoneSalesMap = await getAggregatedZoneSales(storeId);
    const conversion = computeSalesConversion(zoneAnalytics, zoneSalesMap);
    const lostSales = detectLostSales(conversion);
    const recommendations = generateLayoutRecommendations(conversion, lostSales);

    return res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/efficiency-score
 * Issue #39: Composite store floorplan layout efficiency score
 */
router.get("/efficiency-score", async (req, res) => {
  try {
    const storeId = req.query.storeId || null;
    const zoneAnalytics = getLatestCvZoneAnalytics();
    const zoneSalesMap = await getAggregatedZoneSales(storeId);
    const conversion = computeSalesConversion(zoneAnalytics, zoneSalesMap);
    const score = computeLayoutEfficiencyScore(conversion);

    return res.status(200).json({
      success: true,
      data: score,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

