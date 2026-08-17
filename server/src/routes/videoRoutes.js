import express from 'express';
import parser from '../middlewares/upload.js';

const router = express.Router();

router.post('/upload', parser.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No video file uploaded',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Video uploaded successfully',
    video: {
      filename: req.file.filename,
      url: req.file.path,
      public_id: req.file.public_id,
      format: req.file.format,
      size: req.file.size,
    },
  });
});

export default router;