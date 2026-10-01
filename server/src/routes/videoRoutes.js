import express from 'express';
import parser from '../middlewares/upload.js';
import { queueJob, getJobStatus } from '../services/queueService.js';

const router = express.Router();

// POST /api/videos/upload - Upload video clips and trigger queue
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

    const uploadedFiles = req.files.map((file) => ({
      filename: file.filename || file.originalname,
      url: file.path,
      path: file.path,
      public_id: file.filename,
      size: file.size,
    }));

    const jobId = queueJob(cameraId, uploadedFiles);

    return res.status(200).json({
      success: true,
      message: 'Video batch uploaded successfully and queued for processing',
      jobId,
      cameraId,
      files: uploadedFiles,
    });
  });
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