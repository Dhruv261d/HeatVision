import express from 'express';
import parser from '../middlewares/upload.js';
import { queueJob, getJobStatus } from '../services/queueService.js';

const router = express.Router();

// POST /api/videos/upload - Upload video clips (optional auto-start with homography)
router.post('/upload', (req, res) => {
  parser.array('video', 50)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No video files uploaded',
      });
    }

    const cameraId = req.body.cameraId || 'cam_1_entrance';
    const startProcessing =
      req.body.startProcessing === 'true' ||
      req.body.startProcessing === true ||
      req.body.autoStart === 'true' ||
      req.body.autoStart === true;

    let homographyMatrix = null;
    if (req.body.homographyMatrix) {
      try {
        homographyMatrix =
          typeof req.body.homographyMatrix === 'string'
            ? JSON.parse(req.body.homographyMatrix)
            : req.body.homographyMatrix;
      } catch (parseErr) {
        console.warn('[upload] could not parse homographyMatrix:', parseErr.message);
      }
    }

    let mappingConfig = null;
    if (req.body.mappingConfig) {
      try {
        mappingConfig =
          typeof req.body.mappingConfig === 'string'
            ? JSON.parse(req.body.mappingConfig)
            : req.body.mappingConfig;
      } catch (parseErr) {
        console.warn('[upload] could not parse mappingConfig:', parseErr.message);
      }
    }

    const showPreview =
      req.body.showPreview !== false &&
      req.body.showPreview !== 'false';
    const roiPoints = req.body.roiPoints || null;

    const uploadedFiles = req.files.map((file) => ({
      filename: file.filename || file.originalname,
      originalname: file.originalname,
      url: file.path,
      path: file.path,
      public_id: file.filename,
      size: file.size,
    }));

    if (startProcessing) {
      const jobId = await queueJob({
        cameraId,
        files: uploadedFiles,
        homographyMatrix,
        mappingConfig,
        showPreview,
        roiPoints,
        zones: req.body.zones || mappingConfig?.zones,
        storeId: req.body.storeId,
        floorplanId: req.body.floorplanId,
        blueprintSrc: req.body.blueprintSrc || mappingConfig?.blueprintSrc || null,
      });
      return res.status(200).json({
        success: true,
        message: 'Video batch uploaded and queued for processing with mapping',
        jobId,
        cameraId,
        files: uploadedFiles,
        mappingConfig,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully to queue (pending mapping configuration)',
      cameraId,
      files: uploadedFiles,
    });
  });
});

// POST /api/videos/process - Start processing a specific queued video with its homography mapping
router.post('/process', async (req, res) => {
  try {
    const {
      cameraId = 'cam_1_entrance',
      files,
      homographyMatrix,
      mappingConfig,
      showPreview = true,
      roiPoints = null,
      zones = null,
      storeId = null,
      floorplanId = null,
    } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No video files specified for processing job',
      });
    }

    let parsedH = homographyMatrix;
    if (typeof parsedH === 'string') {
      try {
        parsedH = JSON.parse(parsedH);
      } catch (e) {}
    }

    let parsedMapping = mappingConfig;
    if (typeof parsedMapping === 'string') {
      try {
        parsedMapping = JSON.parse(parsedMapping);
      } catch (e) {}
    }

    let parsedRoi = roiPoints;
    if (typeof parsedRoi === 'string') {
      try {
        parsedRoi = JSON.parse(parsedRoi);
      } catch (e) {}
    }

    let parsedZones = zones || parsedMapping?.zones || null;
    if (typeof parsedZones === 'string') {
      try {
        parsedZones = JSON.parse(parsedZones);
      } catch (e) {}
    }

    const previewEnabled = showPreview !== false && showPreview !== 'false';
    const jobId = await queueJob({
      cameraId,
      files,
      homographyMatrix: parsedH,
      mappingConfig: parsedMapping,
      showPreview: previewEnabled,
      roiPoints: parsedRoi,
      zones: parsedZones,
      storeId,
      floorplanId,
      blueprintSrc: req.body.blueprintSrc || parsedMapping?.blueprintSrc || null,
    });

    return res.status(200).json({
      success: true,
      message: `Processing job started with assigned mapping`,
      jobId,
      cameraId,
      files,
      mappingConfig: parsedMapping,
    });
  } catch (err) {
    console.error('[Video Process Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to start video processing job',
    });
  }
});

// POST /api/videos/process-batch - Start processing a batch of jobs each with its own video & mapping
router.post('/process-batch', async (req, res) => {
  try {
    const { jobs } = req.body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A jobs array is required',
      });
    }

    const queuedJobIds = [];

    for (const jobItem of jobs) {
      const {
        cameraId = 'cam_1_entrance',
        files,
        homographyMatrix,
        mappingConfig,
        showPreview = true,
        roiPoints = null,
        zones = null,
        storeId = null,
        floorplanId = null,
      } = jobItem;
      if (files && files.length > 0) {
        let parsedH = homographyMatrix;
        if (typeof parsedH === 'string') {
          try { parsedH = JSON.parse(parsedH); } catch (e) {}
        }
        let parsedMapping = mappingConfig;
        if (typeof parsedMapping === 'string') {
          try { parsedMapping = JSON.parse(parsedMapping); } catch (e) {}
        }
        let parsedRoi = roiPoints;
        if (typeof parsedRoi === 'string') {
          try { parsedRoi = JSON.parse(parsedRoi); } catch (e) {}
        }
        let parsedZones = zones || parsedMapping?.zones || null;
        if (typeof parsedZones === 'string') {
          try { parsedZones = JSON.parse(parsedZones); } catch (e) {}
        }

        const previewEnabled = showPreview !== false && showPreview !== 'false';
        const jobId = await queueJob({
          cameraId,
          files,
          homographyMatrix: parsedH,
          mappingConfig: parsedMapping,
          showPreview: previewEnabled,
          roiPoints: parsedRoi,
          zones: parsedZones,
          storeId,
          floorplanId,
        });
        queuedJobIds.push({ jobId, cameraId, mappingName: parsedMapping?.name || 'Homography' });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${queuedJobIds.length} job(s) queued for processing`,
      jobs: queuedJobIds,
    });
  } catch (err) {
    console.error('[Batch Process Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to queue batch processing jobs',
    });
  }
});

// GET /api/videos/status/:jobId - HTTP fallback to poll status
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJobStatus(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job ID not found',
    });
  }

  return res.status(200).json({
    success: true,
    job,
  });
});

export default router;