import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
 * @param {Array|Object} [options.homographyMatrix] - Optional 3x3 homography matrix
 * @param {Function} [options.onLog] - Callback for stdout messages
 * @param {Function} [options.onError] - Callback for stderr messages
 * @param {Function} [options.onProgress] - Callback for progress events ({ frame, totalFrames, progress })
 * @param {Function} [options.onExit] - Callback on process termination (exitCode)
 * @returns {import('child_process').ChildProcess} spawned child process
 */
export function runCvScript({ videoPath, cameraId, outputPath, homographyMatrix, onLog, onError, onProgress, onExit }) {
  const scriptPath = path.resolve(__dirname, '../../cv_service/src/main.py');

  let pythonExecutable = process.env.PYTHON_PATH || 'python';
  const winVenv = path.resolve(__dirname, '../../cv_service/venv/Scripts/python.exe');
  const unixVenv = path.resolve(__dirname, '../../cv_service/venv/bin/python');

  if (fs.existsSync(winVenv)) {
    pythonExecutable = winVenv;
  } else if (fs.existsSync(unixVenv)) {
    pythonExecutable = unixVenv;
  }

  const args = [
    scriptPath,
    '--video', videoPath,
    '--camera', cameraId || 'cam_1',
    '--output', outputPath || path.resolve(__dirname, '../uploads/temp/output.json'),
  ];

  if (homographyMatrix) {
    args.push('--homography', JSON.stringify(homographyMatrix));
  }

  console.log(`[cv-runner]: Spawning Python CV process: ${pythonExecutable} ${args.join(' ')}`);

  const child = spawn(pythonExecutable, args);

  child.stdout.on('data', (data) => {
    const rawLines = data.toString().split('\n');

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) continue;

      console.log(`[cv-runner][stdout]: ${line}`);
      if (onLog) onLog(line);

      // Check if line contains [CV Progress] payload
      if (line.includes('[CV Progress]:')) {
        try {
          const jsonStr = line.substring(line.indexOf('[CV Progress]:') + '[CV Progress]:'.length).trim();
          const progressData = JSON.parse(jsonStr);
          if (onProgress) onProgress(progressData);
        } catch (parseErr) {
          // Ignore parse errors for non-JSON progress strings
        }
      }
    }
  });

  child.stderr.on('data', (data) => {
    const message = data.toString().trim();
    console.error(`[cv-runner][stderr]: ${message}`);
    if (onError) onError(message);
  });

  child.on('error', (err) => {
    console.error(`[cv-runner]: Subprocess spawn error: ${err.message}`);
    if (onError) onError(err.message);
  });

  child.on('exit', (code, signal) => {
    if (code === 0) {
      console.log(`[cv-runner]: Subprocess completed successfully (code 0)`);
    } else {
      console.error(`[cv-runner]: Subprocess exited with code ${code}, signal ${signal}`);
    }
    if (onExit) onExit(code);
  });

  return child;
}
