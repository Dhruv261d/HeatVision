import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { concatenateClips } from './ffmpegService.js';

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

    // Stage 2: Hand off concatenated video to Python CV Service (Issue #11 & #12)
    job.status = 'processing';
    emitStatus(job);

    const pythonScript = path.resolve(__dirname, '../../../cv_service/main.py');
    let pythonExecutable = process.env.PYTHON_PATH || 'python';
    if (!process.env.PYTHON_PATH) {
      const winVenvPython = path.resolve(__dirname, '../../../cv_service/venv/Scripts/python.exe');
      const unixVenvPython = path.resolve(__dirname, '../../../cv_service/venv/bin/python');
      if (fs.existsSync(winVenvPython)) {
        pythonExecutable = winVenvPython;
      } else if (fs.existsSync(unixVenvPython)) {
        pythonExecutable = unixVenvPython;
      }
    }
    const pyProcess = spawn(pythonExecutable, [pythonScript, inputVideoPath, job.cameraId, job.id]);

    pyProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line.trim());

          if (parsed.type === 'progress') {
            job.currentFrame = parsed.frame || job.currentFrame;
            job.totalFrames = parsed.totalFrames || job.totalFrames;
            job.progress = parsed.progress || job.progress;

            if (ioInstance) {
              ioInstance.emit('processing:progress', {
                jobId: job.id,
                frame: job.currentFrame,
                totalFrames: job.totalFrames,
                progress: job.progress,
              });
            }
          }
        } catch {
          console.log(`[CV Output]: ${line}`);
        }
      }

      emitStatus(job);
    });

    pyProcess.stderr.on('data', (data) => {
      console.error(`[CV Error]: ${data.toString()}`);
    });

    pyProcess.on('close', (code) => {
      // Clean up temporary merged video file
      if (fs.existsSync(mergedOutputPath) && clipPaths.length > 1) {
        fs.unlinkSync(mergedOutputPath);
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
    });

    pyProcess.on('error', (err) => {
      console.error('[CV Spawn Error]:', err);
      job.status = 'failed';
      if (ioInstance) {
        ioInstance.emit('processing:error', { jobId: job.id, error: err.message });
      }
      emitStatus(job);
      isProcessing = false;
      processNextJob();
    });
  } catch (err) {
    console.error('[Queue Exception]:', err);
    job.status = 'failed';
    emitStatus(job);
    isProcessing = false;
    processNextJob();
  }
};