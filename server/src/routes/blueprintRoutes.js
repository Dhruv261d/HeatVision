import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import Blueprint from '../models/Blueprint.js';
import Zone from '../models/Zone.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local blueprints upload directory exists
const uploadDir = path.resolve(__dirname, '../../../data/uploads/blueprints');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage for blueprint uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${timestamp}_${cleanName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed as blueprints'));
    }
  },
});

/**
 * GET /api/blueprints
 * Fetch all blueprints along with their zones
 */
router.get('/', async (req, res) => {
  try {
    const blueprints = await Blueprint.find().sort({ createdAt: -1 });
    const bpIds = blueprints.map((b) => b._id);
    const zones = await Zone.find({ blueprintId: { $in: bpIds } });

    const zonesByBp = {};
    zones.forEach((z) => {
      const bId = z.blueprintId.toString();
      if (!zonesByBp[bId]) zonesByBp[bId] = [];
      zonesByBp[bId].push(z.toJSON());
    });

    const data = blueprints.map((bp) => {
      const json = bp.toJSON();
      return {
        id: json.id,
        name: json.name,
        url: json.imageUrl,
        storeName: json.storeName,
        zones: zonesByBp[json.id] || [],
      };
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[blueprintRoutes] Error fetching blueprints:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blueprints',
      error: error.message,
    });
  }
});

/**
 * POST /api/blueprints
 * Upload a new blueprint image
 */
router.post('/', upload.single('blueprint'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No blueprint image file provided',
      });
    }

    const name = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, '');
    const storeName = req.body.storeName || 'Main Retail Store';

    // Local static URL path
    let imageUrl = `/data/uploads/blueprints/${req.file.filename}`;

    // Attempt Cloudinary upload if configured
    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'heatvision/blueprints',
          resource_type: 'image',
        });
        if (uploadResult?.secure_url) {
          imageUrl = uploadResult.secure_url;
        }
      } catch (cloudErr) {
        console.warn('[blueprintRoutes] Cloudinary upload skipped, using local storage:', cloudErr.message);
      }
    }

    const blueprint = new Blueprint({
      name,
      imageUrl,
      storeName,
    });

    await blueprint.save();

    return res.status(201).json({
      success: true,
      message: 'Blueprint uploaded successfully',
      data: {
        id: blueprint._id.toString(),
        name: blueprint.name,
        url: blueprint.imageUrl,
        storeName: blueprint.storeName,
        zones: [],
      },
    });
  } catch (error) {
    console.error('[blueprintRoutes] Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload blueprint',
      error: error.message,
    });
  }
});

/**
 * GET /api/blueprints/:blueprintId/zones
 * Fetch zones for a specific blueprint
 */
router.get('/:blueprintId/zones', async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const zones = await Zone.find({ blueprintId });
    return res.status(200).json({
      success: true,
      data: zones.map((z) => z.toJSON()),
    });
  } catch (error) {
    console.error('[blueprintRoutes] Error fetching zones:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch zones',
      error: error.message,
    });
  }
});

/**
 * POST /api/blueprints/:blueprintId/zones
 * Save/overwrite zones for a blueprint
 */
router.post('/:blueprintId/zones', async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const { zones } = req.body;

    const blueprint = await Blueprint.findById(blueprintId);
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: 'Blueprint not found',
      });
    }

    if (!Array.isArray(zones)) {
      return res.status(400).json({
        success: false,
        message: 'Zones must be an array',
      });
    }

    // Replace existing zones with new set
    await Zone.deleteMany({ blueprintId });

    const newDocs = zones.map((z) => ({
      blueprintId,
      name: z.name || 'Zone',
      type: z.type || 'shelf',
      shape: z.shape || 'polygon',
      points: z.points,
    }));

    let saved = [];
    if (newDocs.length > 0) {
      saved = await Zone.insertMany(newDocs);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully saved ${saved.length} zones`,
      data: saved.map((z) => z.toJSON()),
    });
  } catch (error) {
    console.error('[blueprintRoutes] Error saving zones:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save zones',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/blueprints/:blueprintId
 * Delete a blueprint and all its zones
 */
router.delete('/:blueprintId', async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const blueprint = await Blueprint.findByIdAndDelete(blueprintId);
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: 'Blueprint not found',
      });
    }

    await Zone.deleteMany({ blueprintId });

    return res.status(200).json({
      success: true,
      message: 'Blueprint and associated zones deleted successfully',
    });
  } catch (error) {
    console.error('[blueprintRoutes] Error deleting blueprint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete blueprint',
      error: error.message,
    });
  }
});

export default router;
