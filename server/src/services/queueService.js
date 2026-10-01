import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { concatenateClips } from './ffmpegService.js';
import { runCvScript } from '../cvRunner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ioInstance = null;
const jobQueue = [];
let isProcessing = false;
const jobsMap = new Map();

export const initQueueSocket = (io) => {
  ioInstance = io;
};

export const queueJob = (cameraId, files) => {
  const jobId = `job_${Date.now()}`;
  const job = {
    id: jobId,
    cameraId,
    files,
    status: 'pending', // pending, concatenating, processing, completed, failed
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    createdAt: new Date().toISOString(),
  };

  jobsMap.set(jobId, job);
  jobQueue.push(jobId);

  emitStatus(job);
  processNextJob();

  return jobId;
};

export const getJobStatus = (jobId) => jobsMap.get(jobId);

const emitStatus = (job) => {
  if (ioInstance) {
    ioInstance.emit('processing:status', job);
  }
};

const processNextJob = async () => {
  if (isProcessing || jobQueue.length === 0) return;

  isProcessing = true;
  const jobId = jobQueue.shift();
  const job = jobsMap.get(jobId);

  try {
    // Stage 1: Concatenate clips using FFmpeg if multiple files exist (Issue #9)
    const clipPaths = job.files.map((f) => f.path || f.url);
    const tempOutputDir = path.resolve(__dirname, '../../uploads/temp');

    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }

    const mergedOutputPath = path.join(tempOutputDir, `merged_${job.id}.mp4`);

    job.status = 'concatenating';
    emitStatus(job);

    const inputVideoPath = await concatenateClips(clipPaths, mergedOutputPath);

    // Stage 2: Hand off concatenated video to Python CV Service (Issue #11, #12, #13)
    job.status = 'processing';
    emitStatus(job);

    const outputJsonPath = path.join(tempOutputDir, `detections_${job.id}.json`);

    runCvScript({
      videoPath: inputVideoPath,
      cameraId: job.cameraId,
      outputPath: outputJsonPath,
      onProgress: (progressData) => {
        job.currentFrame = progressData.frame || job.currentFrame;
        job.totalFrames = progressData.totalFrames || job.totalFrames;
        job.progress = progressData.progress || job.progress;

        if (ioInstance) {
          ioInstance.emit('processing:progress', {
            jobId: job.id,
            frame: job.currentFrame,
            totalFrames: job.totalFrames,
            progress: job.progress,
          });
        }
        emitStatus(job);
      },
      onError: (errMessage) => {
        console.error(`[CV Error][Job ${job.id}]:`, errMessage);
      },
      onExit: (code) => {
        // Clean up temporary merged video file if concatenated
        if (fs.existsSync(mergedOutputPath) && clipPaths.length > 1) {
          try { fs.unlinkSync(mergedOutputPath); } catch (e) {}
        }

        if (code === 0) {
          job.status = 'completed';
          job.progress = 100;
          if (ioInstance) {
            ioInstance.emit('processing:complete', { jobId: job.id, cameraId: job.cameraId });
          }
        } else {
          job.status = 'failed';
          if (ioInstance) {
            ioInstance.emit('processing:error', {
              jobId: job.id,
              error: `Process exited with code ${code}`,
            });
          }
        }

        emitStatus(job);
        isProcessing = false;
        processNextJob();
      }
    });
  } catch (err) {
    console.error('[Queue Exception]:', err);
    job.status = 'failed';
    emitStatus(job);
    isProcessing = false;
    processNextJob();
  }
};