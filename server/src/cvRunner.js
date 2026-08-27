import { spawn } from 'child_process';
import path from 'path';

/**
 * Spawns the Python CV script as a child process and streams its output
 * to the Node console in real-time.
 *
 * @param {Object} options
 * @param {string} options.videoPath - Path to the input video file
 * @param {string} options.cameraId - Camera identifier
 * @param {string} options.outputPath - Path where processed output should be saved
 * @param {Function} [options.onLog] - Optional callback fired with each stdout line
 * @param {Function} [options.onError] - Optional callback fired with each stderr line
 * @param {Function} [options.onExit] - Optional callback fired when the process exits (code)
 * @returns {import('child_process').ChildProcess} the spawned process
 */
export function runCvScript({ videoPath, cameraId, outputPath, onLog, onError, onExit }) {
  // Path to the Python script, relative to this file's location
  const scriptPath = path.resolve('..', 'cv_service', 'src', 'main.py');

  // Use the venv's python if available, otherwise fall back to system python
  // NOTE: adjust 'python' to 'python3' if that's what your system uses
const pythonExecutable = path.resolve('..', 'cv_service', 'venv', 'Scripts', 'python.exe');
  const args = [
    scriptPath,
    '--video', videoPath,
    '--camera', cameraId,
    '--output', outputPath,
  ];

  console.log(`[cv-runner]: Spawning Python process: ${pythonExecutable} ${args.join(' ')}`);

  const child = spawn(pythonExecutable, args);

  // Capture stdout line-by-line as it streams in
  child.stdout.on('data', (data) => {
    const message = data.toString().trim();
    console.log(`[cv-runner][stdout]: ${message}`);
    if (onLog) onLog(message);
  });

  // Capture stderr line-by-line as it streams in
  child.stderr.on('data', (data) => {
    const message = data.toString().trim();
    console.error(`[cv-runner][stderr]: ${message}`);
    if (onError) onError(message);
  });

  // Handle process-level errors (e.g. python executable not found)
  child.on('error', (err) => {
    console.error(`[cv-runner]: Failed to start subprocess: ${err.message}`);
    if (onError) onError(err.message);
  });

  // Handle clean exit
  child.on('exit', (code, signal) => {
    if (code === 0) {
      console.log(`[cv-runner]: Process completed successfully (exit code ${code})`);
    } else {
      console.error(`[cv-runner]: Process exited with code ${code}, signal ${signal}`);
    }
    if (onExit) onExit(code);
  });

  return child;
}
