import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { concatenateClips } from "./ffmpegService.js";
import { runCvScript } from "../cvRunner.js";
import Zone from "../models/Zone.js";
import { getZonedata } from "../utils/getZonedata.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ioInstance = null;
const jobQueue = [];
let isProcessing = false;
const jobsMap = new Map();

export const initQueueSocket = (io) => {
  ioInstance = io;
};

export const queueJob = async (
  arg1,
  filesArg,
  arg3,
  arg4,
  arg5,
  arg6,
  arg7,
  arg8,
) => {
  let cameraId = "cam_1_entrance";
  let files = [];
  let storeId = null;
  let floorplanId = null;
  let homographyMatrix = null;
  let mappingConfig = null;
  let showPreview = true;
  let roiPoints = null;
  let zones = null;

  let blueprintSrc = null;

  if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
    // Called with options object
    cameraId = arg1.cameraId || cameraId;
    files = arg1.files || [];
    storeId = arg1.storeId || null;
    floorplanId = arg1.floorplanId || null;
    homographyMatrix = arg1.homographyMatrix || null;
    mappingConfig = arg1.mappingConfig || null;
    showPreview = arg1.showPreview !== false;
    roiPoints = arg1.roiPoints || null;
    zones = arg1.zones || null;
    blueprintSrc = arg1.blueprintSrc || arg1.mappingConfig?.blueprintSrc || null;
  } else {
    // Called with positional arguments
    cameraId = arg1 || cameraId;
    files = filesArg || [];

    if (typeof arg3 === "string" && /^[0-9a-fA-F]{24}$/.test(arg3)) {
      storeId = arg3;
      floorplanId = arg4;
      homographyMatrix = arg5;
      mappingConfig = arg6;
      showPreview = arg7 !== false;
      roiPoints = arg8;
      blueprintSrc = mappingConfig?.blueprintSrc || null;
    } else {
      homographyMatrix = arg3 || null;
      mappingConfig = arg4 || null;
      showPreview = arg5 !== false && arg5 !== "false";
      roiPoints = arg6 || null;
      zones = arg7 || null;
      storeId = arg8 || null;
      blueprintSrc = mappingConfig?.blueprintSrc || null;
    }
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Automatically extract calibrated videoPoints as ROI if roiPoints not explicitly provided
  let effectiveRoi = roiPoints;
  if (!effectiveRoi && mappingConfig) {
    const rawPts = mappingConfig.videoPoints || mappingConfig.roiPoints;
    if (Array.isArray(rawPts) && rawPts.length >= 3) {
      effectiveRoi = rawPts.map((p) =>
        Array.isArray(p) ? p : [Math.round(p.x || 0), Math.round(p.y || 0)],
      );
    }
  }

  let effectiveZones = zones || mappingConfig?.zones || null;
  if ((!effectiveZones || effectiveZones.length === 0) && storeId) {
    try {
      const dbZones = await getZonedata({ storeId, floorplanId });
      if (Array.isArray(dbZones) && dbZones.length > 0) {
        effectiveZones = dbZones;
      }
    } catch (e) {
      console.warn("[queueService] Could not fetch DB zones:", e.message);
    }
  }

  const job = {
    id: jobId,
    cameraId,
    files,
    homographyMatrix,
    mappingConfig,
    roiPoints: effectiveRoi,
    zones: effectiveZones || [],
    blueprintSrc: blueprintSrc || mappingConfig?.blueprintSrc || null,
    showPreview: showPreview !== false,
    status: "pending", // pending, concatenating, processing, completed, failed
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    createdAt: new Date().toISOString(),
  };
  console.log("in job queue:", job);

  jobsMap.set(jobId, job);
  jobQueue.push(jobId);

  emitStatus(job);
  processNextJob();

  return jobId;
};

export const getJobStatus = (jobId) => jobsMap.get(jobId);

const emitStatus = (job) => {
  if (ioInstance) {
    ioInstance.emit("processing:status", job);
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
    const tempOutputDir = path.resolve(__dirname, "../../uploads/temp");

    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }

    const mergedOutputPath = path.join(tempOutputDir, `merged_${job.id}.mp4`);

    job.status = "concatenating";
    emitStatus(job);

    const inputVideoPath = await concatenateClips(clipPaths, mergedOutputPath);

    // Stage 2: Hand off concatenated video to Python CV Service (Issue #11, #12, #13)
    job.status = "processing";
    emitStatus(job);

    const outputJsonPath = path.join(
      tempOutputDir,
      `detections_${job.id}.json`,
    );

    const annotatedVideoPath = path.join(
      tempOutputDir,
      `annotated_${job.id}.mp4`,
    );

    // Resolve blueprint image from job mapping if provided
    let effectiveBlueprintPath = null;
    const rawBp = job.blueprintSrc || job.mappingConfig?.blueprintSrc;
    if (rawBp && typeof rawBp === "string") {
      if (rawBp.startsWith("data:image")) {
        try {
          const commaIdx = rawBp.indexOf(",");
          if (commaIdx !== -1) {
            const header = rawBp.substring(0, commaIdx);
            const base64Data = rawBp.substring(commaIdx + 1);
            let ext = "png";
            if (header.includes("jpeg") || header.includes("jpg")) ext = "jpg";
            else if (header.includes("webp")) ext = "webp";
            const bpFilePath = path.join(tempOutputDir, `blueprint_${job.id}.${ext}`);
            fs.writeFileSync(bpFilePath, Buffer.from(base64Data, "base64"));
            effectiveBlueprintPath = bpFilePath;
            console.log(`[queueService] Saved base64 blueprint to ${bpFilePath}`);
          }
        } catch (bpErr) {
          console.warn("[queueService] Could not write base64 blueprint:", bpErr.message);
        }
      } else if (fs.existsSync(rawBp)) {
        effectiveBlueprintPath = rawBp;
      } else {
        let pathname = rawBp;
        try {
          if (rawBp.startsWith("http://") || rawBp.startsWith("https://")) {
            pathname = new URL(rawBp).pathname;
          }
        } catch (e) {}
        const cleaned = pathname.replace(/^\/+/, "").replace(/^uploads\//, "");
        const basename = path.basename(pathname);
        const candidates = [
          path.resolve(__dirname, "../../../client/public", cleaned),
          path.resolve(__dirname, "../../../client/public", basename),
          path.resolve(__dirname, "../../uploads", cleaned),
          path.resolve(__dirname, "../../uploads", basename),
          path.resolve(__dirname, "../../../data/uploads/blueprints", basename),
          path.resolve(__dirname, "../../../data/processed", basename),
          path.resolve(__dirname, "../../../client/public/sample-blueprint.jpg"),
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            effectiveBlueprintPath = cand;
            break;
          }
        }
      }
    }

    // Ultimate fallback if no blueprint was provided
    if (!effectiveBlueprintPath || !fs.existsSync(effectiveBlueprintPath)) {
      const defaultBp = path.resolve(__dirname, "../../../client/public/sample-blueprint.jpg");
      if (fs.existsSync(defaultBp)) {
        effectiveBlueprintPath = defaultBp;
      }
    }

    runCvScript({
      videoPath: inputVideoPath,
      cameraId: job.cameraId,
      outputPath: outputJsonPath,
      debugVideoPath: annotatedVideoPath,
      showPreview: job.showPreview,
      liveStream: true,
      homographyMatrix: job.homographyMatrix || null,
      roiPoints: job.roiPoints || null,
      zones: job.zones || [],
      blueprintResolution: job.mappingConfig?.blueprintResolution || null,
      blueprintPath: effectiveBlueprintPath,
      onFrame: (frameBase64) => {
        if (ioInstance) {
          ioInstance.emit("processing:frame", {
            jobId: job.id,
            frame: job.currentFrame,
            image: frameBase64,
          });
        }
      },
      onProgress: (progressData) => {
        job.currentFrame = progressData.frame || job.currentFrame;
        job.totalFrames = progressData.totalFrames || job.totalFrames;
        job.progress = progressData.progress || job.progress;

        if (ioInstance) {
          ioInstance.emit("processing:progress", {
            jobId: job.id,
            frame: job.currentFrame,
            totalFrames: job.totalFrames,
            progress: job.progress,
            mappingName: job.mappingConfig?.name || "Homography",
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
          try {
            fs.unlinkSync(mergedOutputPath);
          } catch (e) {}
        }

        if (code === 0) {
          job.status = "completed";
          job.progress = 100;
          const relativeAnnotatedUrl = fs.existsSync(annotatedVideoPath)
            ? `/uploads/temp/annotated_${job.id}.mp4`
            : null;
          job.annotatedVideoUrl = relativeAnnotatedUrl;

          // Copy blueprint to latest_blueprint for heatmap viewers
          if (effectiveBlueprintPath && fs.existsSync(effectiveBlueprintPath)) {
            try {
              const dest1 = path.resolve(__dirname, "../../uploads/heatmaps/latest_blueprint.png");
              const dest2 = path.resolve(__dirname, "../../../data/processed/latest_blueprint.png");
              const dest3 = path.resolve(__dirname, "../../../client/public/latest_blueprint.png");
              fs.mkdirSync(path.dirname(dest1), { recursive: true });
              fs.mkdirSync(path.dirname(dest2), { recursive: true });
              fs.mkdirSync(path.dirname(dest3), { recursive: true });
              fs.copyFileSync(effectiveBlueprintPath, dest1);
              fs.copyFileSync(effectiveBlueprintPath, dest2);
              fs.copyFileSync(effectiveBlueprintPath, dest3);
            } catch (cpErr) {
              console.warn("[queueService] Could not mirror latest blueprint:", cpErr.message);
            }
          }

          if (ioInstance) {
            ioInstance.emit("processing:complete", {
              jobId: job.id,
              cameraId: job.cameraId,
              mappingConfig: job.mappingConfig,
              annotatedVideoUrl: relativeAnnotatedUrl,
            });
          }
        } else {
          job.status = "failed";
          if (ioInstance) {
            ioInstance.emit("processing:error", {
              jobId: job.id,
              error: `Process exited with code ${code}`,
            });
          }
        }

        emitStatus(job);
        isProcessing = false;
        processNextJob();
      },
    });
  } catch (err) {
    console.error("[Queue Exception]:", err);
    job.status = "failed";
    emitStatus(job);
    isProcessing = false;
    processNextJob();
  }
};
