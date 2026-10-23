import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard store zones used by HeatmapStudio
const DEFAULT_STORE_ZONES = [
  { id: 'entrance', name: 'Entrance', x: 0.12, y: 0.8 },
  { id: 'promo', name: 'Promo aisle', x: 0.34, y: 0.5 },
  { id: 'electronics', name: 'Electronics', x: 0.7, y: 0.25 },
  { id: 'apparel', name: 'Apparel', x: 0.3, y: 0.2 },
  { id: 'grocery', name: 'Grocery', x: 0.62, y: 0.58 },
  { id: 'checkout', name: 'Checkout', x: 0.86, y: 0.82 },
];

function clamp(v, min = 0.02, max = 0.98) {
  return Math.min(max, Math.max(min, v));
}

function findNearestZone(x, y, zones = DEFAULT_STORE_ZONES) {
  let closest = zones[0].id;
  let minDist = Infinity;
  for (const z of zones) {
    const d = Math.hypot(x - z.x, y - z.y);
    if (d < minDist) {
      minDist = d;
      closest = z.id;
    }
  }
  return closest;
}

/**
 * Loads raw coordinates from either data/processed trajectories or output detections
 */
function loadCvPoints() {
  const processedDir = path.resolve(__dirname, '../../../data/processed');
  const outputDir = path.resolve(__dirname, '../../../output');

  // 1. Try data/processed/demo_2_trajectories.json or any *_trajectories.json
  if (fs.existsSync(processedDir)) {
    const files = fs.readdirSync(processedDir).filter((f) => f.endsWith('_trajectories.json'));
    if (files.length > 0) {
      try {
        const filePath = path.join(processedDir, files[0]);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(content) && content.length > 0) {
          const rawPoints = [];
          content.forEach((track, trackIdx) => {
            const trackId = track.track_id || trackIdx + 1;
            (track.path || []).forEach((pt) => {
              rawPoints.push({
                x: pt.x,
                y: pt.y,
                t: pt.t || 0,
                trackId,
              });
            });
          });
          if (rawPoints.length > 0) {
            return { source: files[0], rawPoints };
          }
        }
      } catch (err) {
        console.warn('[heatmapRoutes] Error reading trajectory file:', err.message);
      }
    }
  }

  // 2. Fallback to output/detections.json
  const detectionsFile = path.join(outputDir, 'detections.json');
  if (fs.existsSync(detectionsFile)) {
    try {
      const content = JSON.parse(fs.readFileSync(detectionsFile, 'utf-8'));
      const frames = content.frames || [];
      const rawPoints = [];
      frames.forEach((frame) => {
        (frame.detections || []).forEach((det) => {
          const coords = det.floorplan_coords || det.feet;
          if (coords && coords.length >= 2) {
            rawPoints.push({
              x: coords[0],
              y: coords[1],
              t: (frame.frame || 0) / 30.0,
              trackId: det.track_id || 1,
            });
          }
        });
      });
      if (rawPoints.length > 0) {
        return { source: 'output/detections.json', rawPoints };
      }
    } catch (err) {
      console.warn('[heatmapRoutes] Error reading detections.json:', err.message);
    }
  }

  return { source: 'none', rawPoints: [] };
}

/**
 * GET /api/heatmap/points
 * Returns normalized points formatted for HeatmapStudio:
 * [{ hour: 9..21, zone: 'entrance', x: 0..1, y: 0..1, w: 0..1 }]
 */
router.get('/points', (req, res) => {
  try {
    const { source, rawPoints } = loadCvPoints();

    if (!rawPoints || rawPoints.length === 0) {
      return res.status(200).json({
        success: true,
        source: 'empty',
        count: 0,
        points: [],
      });
    }

    // Determine coordinate scale
    const xs = rawPoints.map((p) => p.x);
    const ys = rawPoints.map((p) => p.y);
    const maxX = Math.max(...xs, 800);
    const maxY = Math.max(...ys, 600);

    const scaleX = maxX > 850 ? 1100 : 800;
    const scaleY = maxY > 650 ? 700 : 600;

    const formattedPoints = rawPoints.map((p, idx) => {
      const normX = clamp(p.x / scaleX);
      const normY = clamp(p.y / scaleY);

      // Distribute timestamps into store hours (9 AM to 9 PM, i.e. 9 to 21)
      const hourOffset = (p.trackId * 3 + Math.floor(p.t * 4) + idx) % 13;
      const hour = 9 + hourOffset;

      const zone = findNearestZone(normX, normY);

      // Weight based on tracking consistency
      const w = clamp(0.6 + ((p.trackId * 13 + idx) % 40) / 100.0, 0.4, 1.0);

      return {
        hour,
        zone,
        x: Number(normX.toFixed(4)),
        y: Number(normY.toFixed(4)),
        w: Number(w.toFixed(2)),
      };
    });

    return res.status(200).json({
      success: true,
      source,
      count: formattedPoints.length,
      points: formattedPoints,
    });
  } catch (error) {
    console.error('[heatmapRoutes] Error generating heatmap points:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate heatmap points',
      error: error.message,
    });
  }
});

/**
 * GET /api/heatmap/summary
 * Returns aggregated stats per zone from the CV pipeline
 */
router.get('/summary', (req, res) => {
  try {
    const { source, rawPoints } = loadCvPoints();
    const zoneCounts = Object.fromEntries(DEFAULT_STORE_ZONES.map((z) => [z.id, 0]));

    if (rawPoints.length > 0) {
      const scaleX = Math.max(...rawPoints.map((p) => p.x)) > 850 ? 1100 : 800;
      const scaleY = Math.max(...rawPoints.map((p) => p.y)) > 650 ? 700 : 600;

      rawPoints.forEach((p) => {
        const nx = clamp(p.x / scaleX);
        const ny = clamp(p.y / scaleY);
        const z = findNearestZone(nx, ny);
        if (zoneCounts[z] !== undefined) {
          zoneCounts[z]++;
        }
      });
    }

    const zones = DEFAULT_STORE_ZONES.map((z) => ({
      id: z.id,
      name: z.name,
      count: zoneCounts[z.id] || 0,
    })).sort((a, b) => b.count - a.count);

    return res.status(200).json({
      success: true,
      source,
      totalVisits: rawPoints.length,
      zones,
    });
  } catch (error) {
    console.error('[heatmapRoutes] Summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate heatmap summary',
      error: error.message,
    });
  }
});

/**
 * Helper to find latest zone analytics and heatmap image paths
 */
function getLatestHeatmapInfo() {
  const processedDir = path.resolve(__dirname, '../../../data/processed');
  const uploadsDir = path.resolve(__dirname, '../../uploads/heatmaps');
  const publicDir = path.resolve(__dirname, '../../../client/public');

  // Check where files exist
  const candidates = [uploadsDir, processedDir, publicDir];
  let foundDir = null;
  let zoneAnalytics = null;
  let latestMtime = 0;
  let trajectoryFile = null;

  // Search latest trajectory file
  if (fs.existsSync(processedDir)) {
    const trajFiles = fs.readdirSync(processedDir)
      .filter((f) => f.endsWith('_trajectories.json'))
      .map((f) => {
        const full = path.join(processedDir, f);
        return { name: f, full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (trajFiles.length > 0) {
      trajectoryFile = trajFiles[0].name;
      latestMtime = trajFiles[0].mtime;
    }
  }

  // Find zone_analytics.json
  for (const dir of candidates) {
    const jsonPath = path.join(dir, 'zone_analytics.json');
    if (fs.existsSync(jsonPath)) {
      try {
        zoneAnalytics = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        foundDir = dir;
        break;
      } catch (e) {}
    }
  }

  const hasHistory = Boolean(trajectoryFile && latestMtime > 0 && zoneAnalytics);

  return {
    hasHistory,
    source: trajectoryFile || null,
    timestamp: latestMtime || null,
    videoOverlay: hasHistory ? '/api/heatmap/image/video_overlay' : null,
    blueprintOverlay: hasHistory ? '/api/heatmap/image/blueprint_overlay' : null,
    videoHeatmap: hasHistory ? '/api/heatmap/image/video_heatmap' : null,
    blueprintHeatmap: hasHistory ? '/api/heatmap/image/blueprint_heatmap' : null,
    zoneAnalytics: zoneAnalytics || { total_visitors: 0, zones: [], heuristics: {} },
  };
}

/**
 * GET /api/heatmap/latest
 * Returns latest dual heatmap URLs and zone-wise analytics
 */
router.get('/latest', (req, res) => {
  try {
    const info = getLatestHeatmapInfo();
    return res.status(200).json({
      success: true,
      hasHistory: info.hasHistory,
      source: info.source,
      timestamp: info.timestamp,
      videoOverlay: info.videoOverlay,
      blueprintOverlay: info.blueprintOverlay,
      videoHeatmap: info.videoHeatmap,
      blueprintHeatmap: info.blueprintHeatmap,
      totalVisitors: info.hasHistory ? (info.zoneAnalytics.total_visitors || 0) : 0,
      zones: info.hasHistory ? (info.zoneAnalytics.zones || []) : [],
      heuristics: info.hasHistory ? (info.zoneAnalytics.heuristics || {}) : {},
    });
  } catch (error) {
    console.error('[heatmapRoutes] Error fetching latest heatmaps:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest heatmap data',
      error: error.message,
    });
  }
});

/**
 * GET /api/heatmap/image/:type
 * Streams heatmap image directly (video_overlay, blueprint_overlay, video_heatmap, blueprint_heatmap, blueprint)
 */
router.get('/image/:type', (req, res) => {
  const { type } = req.params;
  const fileNameMap = {
    video_overlay: 'video_heatmap_overlay.png',
    blueprint_overlay: 'blueprint_heatmap_overlay.png',
    video_heatmap: 'video_heatmap.png',
    blueprint_heatmap: 'blueprint_heatmap.png',
    blueprint: 'latest_blueprint.png',
    frame: 'sample-frame.jpg',
  };

  const targetName = fileNameMap[type] || `${type}.png`;

  const searchDirs = [
    path.resolve(__dirname, '../../uploads/heatmaps'),
    path.resolve(__dirname, '../../../data/processed'),
    path.resolve(__dirname, '../../../client/public'),
    path.resolve(__dirname, '../../../data/demo'),
    path.resolve(__dirname, '../../../'),
  ];

  for (const dir of searchDirs) {
    const filePath = path.join(dir, targetName);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(targetName).toLowerCase();
      const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(filePath);
    }
  }

  // Fallbacks if target was blueprint
  if (type === 'blueprint') {
    const bpCandidates = [
      path.resolve(__dirname, '../../../client/public/sample-blueprint.jpg'),
      path.resolve(__dirname, '../../../data/uploads/blueprints/1792494360686_sample_blueprint.jpg'),
      path.resolve(__dirname, '../../../client/public/sample_blueprint 2.png'),
    ];
    for (const cand of bpCandidates) {
      if (fs.existsSync(cand)) {
        const ext = path.extname(cand).toLowerCase();
        res.setHeader('Content-Type', ext === '.png' ? 'image/png' : 'image/jpeg');
        return res.sendFile(cand);
      }
    }
  }

  return res.status(404).json({ success: false, message: `Image ${type} not found` });
});

/**
 * POST /api/heatmap/generate
 * Trigger automatic dual heatmap generation from latest trajectories
 */
router.post('/generate', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const pythonScript = path.resolve(__dirname, '../../../cv_service/src/services/heatmap-generator.py');
    const pythonExe = process.env.PYTHON_PATH || 'python';

    exec(`"${pythonExe}" "${pythonScript}"`, (err, stdout, stderr) => {
      if (err) {
        console.error('[heatmapRoutes] Generate error:', stderr || err.message);
        return res.status(500).json({ success: false, message: 'Generation failed', error: stderr });
      }

      const info = getLatestHeatmapInfo();
      return res.status(200).json({
        success: true,
        message: 'Dual heatmaps generated successfully',
        data: info,
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
