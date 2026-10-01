import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export const concatenateClips = (clipPaths, outputFilePath) => {
  return new Promise((resolve, reject) => {
    if (!clipPaths || clipPaths.length === 0) {
      return reject(new Error('No clips provided for stitching'));
    }

    // Bypass FFmpeg overhead if only a single clip is provided
    if (clipPaths.length === 1) {
      return resolve(clipPaths[0]);
    }

    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create temp manifest list file for FFmpeg concat demuxer
    const manifestPath = path.join(outputDir, `manifest_${Date.now()}.txt`);
    const fileContent = clipPaths
      .map((p) => `file '${path.resolve(p).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
      .join('\n');

    fs.writeFileSync(manifestPath, fileContent);

    ffmpeg()
      .input(manifestPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy']) // Fast join without re-encoding
      .output(outputFilePath)
      .on('end', () => {
        if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
        resolve(outputFilePath);
      })
      .on('error', (err) => {
        if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
        reject(err);
      })
      .run();
  });
};