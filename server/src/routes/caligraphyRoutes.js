import express from "express";
import calculateHMatrix from "../utils/calculateHMatrix.js";

const router = express.Router();

const handleCalibrate = async (req, res) => {
  try {
    const videoPoints =
      req.body.videoPoints ||
      req.body.sourcePoints ||
      req.body.srcPts ||
      req.body.video_points;

    const blueprintPoints =
      req.body.blueprintPoints ||
      req.body.floorplanPoints ||
      req.body.destinationPoints ||
      req.body.dstPts ||
      req.body.blueprint_points;

    if (!videoPoints || !blueprintPoints) {
      return res.status(400).json({
        success: false,
        message: "Missing coordinate points: both videoPoints and blueprintPoints are required.",
      });
    }

    if (!Array.isArray(videoPoints) || videoPoints.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "videoPoints must be an array of exactly 4 coordinates.",
      });
    }

    if (!Array.isArray(blueprintPoints) || blueprintPoints.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "blueprintPoints must be an array of exactly 4 coordinates.",
      });
    }

    console.log("[Caligraphy API] Video Points:", videoPoints);
    console.log("[Caligraphy API] Blueprint Points:", blueprintPoints);

    const H = await calculateHMatrix(videoPoints, blueprintPoints);
    console.log("[Caligraphy API] Homography Matrix Calculated:", H);

    return res.status(200).json({
      success: true,
      message: "Homography matrix calculated successfully",
      HMatrix: H,
    });
  } catch (error) {
    console.error("[Caligraphy API] Error calculating homography matrix:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Error calculating homography matrix",
      error: error.message,
    });
  }
};

// In-memory persistent store mapping presets (seeded with standard retail camera angles)
const defaultStorePresets = [
  {
    id: "preset_entrance",
    name: "Ground Floor - Main Entrance",
    description: "Camera 1 wide-angle entrance corridor perspective",
    camera: "cam_1_entrance",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 192, y: 108 },
      { x: 1088, y: 108 },
      { x: 1088, y: 612 },
      { x: 192, y: 612 },
    ],
    blueprintPoints: [
      { x: 160, y: 120 },
      { x: 640, y: 120 },
      { x: 640, y: 480 },
      { x: 160, y: 480 },
    ],
    HMatrix: [
      [0.5357, 0.0000, 57.14],
      [0.0000, 0.7142, 42.85],
      [0.0000, 0.0000, 1.0000],
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset_aisle_a",
    name: "Retail Corridor - Aisle A",
    description: "Longitudinal perspective mapping for retail shelving aisle A",
    camera: "cam_2_aisle_a",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 320, y: 140 },
      { x: 960, y: 140 },
      { x: 1150, y: 650 },
      { x: 130, y: 650 },
    ],
    blueprintPoints: [
      { x: 200, y: 100 },
      { x: 600, y: 100 },
      { x: 600, y: 550 },
      { x: 200, y: 550 },
    ],
    HMatrix: [
      [0.6250, 0.0000, 0.0000],
      [0.0000, 0.8800, -23.20],
      [0.0000, 0.0001, 1.0000],
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset_checkout",
    name: "Checkout Counter & Cashier 1",
    description: "Counter angle perspective mapping for cashier registers 1-4",
    camera: "cam_3_checkout",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 250, y: 180 },
      { x: 1020, y: 180 },
      { x: 920, y: 680 },
      { x: 180, y: 680 },
    ],
    blueprintPoints: [
      { x: 180, y: 150 },
      { x: 680, y: 150 },
      { x: 680, y: 500 },
      { x: 180, y: 500 },
    ],
    HMatrix: [
      [0.6493, 0.0000, 17.53],
      [0.0000, 0.7000, 24.00],
      [0.0000, 0.0000, 1.0000],
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset_backroom",
    name: "Backroom & Logistics Loading Bay",
    description: "Stockroom perspective mapping for logistics and inventory tracking",
    camera: "cam_4_backroom",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 210, y: 120 },
      { x: 1060, y: 120 },
      { x: 1010, y: 640 },
      { x: 240, y: 640 },
    ],
    blueprintPoints: [
      { x: 150, y: 100 },
      { x: 650, y: 100 },
      { x: 650, y: 520 },
      { x: 150, y: 520 },
    ],
    HMatrix: [
      [0.5882, 0.0000, 26.47],
      [0.0000, 0.8076, 3.07],
      [0.0000, 0.0000, 1.0000],
    ],
    createdAt: new Date().toISOString(),
  },
];

let customStorePresets = [...defaultStorePresets];

// GET /api/caligraphy/presets - Fetch all available store mapping presets
router.get("/presets", (req, res) => {
  return res.status(200).json({
    success: true,
    presets: customStorePresets,
  });
});

// POST /api/caligraphy/presets - Save a newly created store mapping preset
router.post("/presets", async (req, res) => {
  try {
    const { name, description, camera, videoPoints, blueprintPoints, HMatrix, videoResolution, blueprintResolution } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Preset name is required" });
    }

    let calculatedH = HMatrix;
    if (!calculatedH && videoPoints && blueprintPoints) {
      calculatedH = await calculateHMatrix(videoPoints, blueprintPoints);
    }

    if (!calculatedH) {
      return res.status(400).json({ success: false, message: "A valid Homography matrix or coordinate points are required" });
    }

    const newPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description || "Custom retail camera perspective mapping",
      camera: camera || "cam_1_entrance",
      videoResolution: videoResolution || { width: 1280, height: 720 },
      blueprintResolution: blueprintResolution || { width: 800, height: 600 },
      videoPoints: videoPoints || [],
      blueprintPoints: blueprintPoints || [],
      HMatrix: calculatedH,
      createdAt: new Date().toISOString(),
    };

    customStorePresets.push(newPreset);

    return res.status(201).json({
      success: true,
      message: "Store mapping preset saved successfully",
      preset: newPreset,
    });
  } catch (err) {
    console.error("[Caligraphy Presets API Error]:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/calibrate", handleCalibrate);
router.post("/", handleCalibrate);

router.get("/calibrate", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Caligraphy calibration endpoint ready. Send POST with videoPoints and blueprintPoints.",
  });
});

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Caligraphy API is online. Send POST with videoPoints and blueprintPoints.",
  });
});

export default router;
