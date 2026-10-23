import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Spawns the Python CV script as a child process and streams output
 * to console and callbacks in real-time. (Issue #13)
 *
 * @param {Object} options
 * @param {string} options.videoPath - Path to input video file
 * @param {string} options.cameraId - Camera identifier
 * @param {string} options.outputPath - Path to save JSON output
 * @param {string} [options.debugVideoPath] - Path to save annotated debug video MP4
 * @param {boolean} [options.showPreview] - Display OpenCV window GUI preview
 * @param {boolean} [options.liveStream] - Stream base64 JPEG preview frames via stdout
 * @param {Array|Object} [options.homographyMatrix] - Optional 3x3 homography matrix
 * @param {Array} [options.roiPoints] - Optional ROI polygon coordinates [[x,y], ...]
 * @param {Function} [options.onLog] - Callback for stdout messages
 * @param {Function} [options.onError] - Callback for stderr messages
 * @param {Function} [options.onProgress] - Callback for progress events ({ frame, totalFrames, progress })
 * @param {Function} [options.onFrame] - Callback for live preview frames (base64 string)
 * @param {Function} [options.onExit] - Callback on process termination (exitCode)
 * @returns {import('child_process').ChildProcess} spawned child process
 */
export function runCvScript({
  videoPath,
  cameraId,
  outputPath,
  debugVideoPath,
  showPreview = false,
  liveStream = true,
  homographyMatrix,
  roiPoints,
  zones,
  blueprintResolution,
  blueprintPath,
  onLog,
  onError,
  onProgress,
  onFrame,
  onExit,
}) {
  const scriptPath = path.resolve(__dirname, "../../cv_service/src/main.py");

  let pythonExecutable = process.env.PYTHON_PATH;

  if (!pythonExecutable || !fs.existsSync(pythonExecutable)) {
    const candidates = [
      path.resolve(__dirname, "../../cv_service/.venv/Scripts/python.exe"),
      path.resolve(__dirname, "../../cv_service/venv/Scripts/python.exe"),
      path.resolve(__dirname, "../../cv_service/.venv/bin/python"),
      path.resolve(__dirname, "../../cv_service/venv/bin/python"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        pythonExecutable = candidate;
        break;
      }
    }
  }

  if (!pythonExecutable) {
    pythonExecutable = process.env.PYTHON_PATH || "python";
  }

  const args = [
    scriptPath,
    "--video",
    videoPath,
    "--camera",
    cameraId || "cam_1",
    "--output",
    outputPath || path.resolve(__dirname, "../uploads/temp/output.json"),
  ];

  if (debugVideoPath) {
    args.push("--debug-video", debugVideoPath);
  }

  if (showPreview) {
    args.push("--preview");
  }

  if (liveStream) {
    args.push("--live-stream");
  }

  if (homographyMatrix) {
    args.push("--homography", JSON.stringify(homographyMatrix));
  }

  if (roiPoints && Array.isArray(roiPoints) && roiPoints.length >= 3) {
    args.push("--roi", JSON.stringify(roiPoints));
  }

  let tempZonesFile = null;
  if (zones && (Array.isArray(zones) ? zones.length > 0 : Boolean(zones))) {
    try {
      const tempDir = path.resolve(__dirname, "../uploads/temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      tempZonesFile = path.join(
        tempDir,
        `zones_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.json`,
      );
      fs.writeFileSync(tempZonesFile, JSON.stringify(zones));
      args.push("--zones", tempZonesFile);
    } catch (writeErr) {
      console.warn("[cv-runner] Failed to write temp zones file, passing stringified zones:", writeErr);
      args.push("--zones", JSON.stringify(zones));
    }
  }

  if (blueprintResolution) {
    args.push("--blueprint-resolution", JSON.stringify(blueprintResolution));
  }

  if (blueprintPath && fs.existsSync(blueprintPath)) {
    args.push("--blueprint", blueprintPath);
  }

  console.log(
    `[cv-runner]: Spawning Python CV process: ${pythonExecutable} ${args.join(" ")}`,
  );

  const child = spawn(pythonExecutable, args);

  child.stdout.on("data", (data) => {
    const rawLines = data.toString().split("\n");

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Check if line contains [CV Frame] base64 preview frame
      if (line.startsWith("[CV Frame]:")) {
        const frameData = line.substring("[CV Frame]:".length).trim();
        if (onFrame) onFrame(frameData);
        continue; // do not flood console log with base64 data
      }

      console.log(`[cv-runner][stdout]: ${line}`);
      if (onLog) onLog(line);

      // Check if line contains [CV Progress] payload
      if (line.includes("[CV Progress]:")) {
        try {
          const jsonStr = line
            .substring(line.indexOf("[CV Progress]:") + "[CV Progress]:".length)
            .trim();
          const progressData = JSON.parse(jsonStr);
          if (onProgress) onProgress(progressData);
        } catch (parseErr) {
          // Ignore parse errors for non-JSON progress strings
        }
      }
    }
  });

  child.stderr.on("data", (data) => {
    const message = data.toString().trim();
    console.error(`[cv-runner][stderr]: ${message}`);
    if (onError) onError(message);
  });

  child.on("error", (err) => {
    console.error(`[cv-runner]: Subprocess spawn error: ${err.message}`);
    if (tempZonesFile && fs.existsSync(tempZonesFile)) {
      try { fs.unlinkSync(tempZonesFile); } catch (e) {}
    }
    if (onError) onError(err.message);
  });

  child.on("exit", (code, signal) => {
    if (tempZonesFile && fs.existsSync(tempZonesFile)) {
      try { fs.unlinkSync(tempZonesFile); } catch (e) {}
    }
    if (code === 0) {
      console.log(`[cv-runner]: Subprocess completed successfully (code 0)`);
    } else {
      console.error(
        `[cv-runner]: Subprocess exited with code ${code}, signal ${signal}`,
      );
    }
    if (onExit) onExit(code);
  });

  return child;
}
