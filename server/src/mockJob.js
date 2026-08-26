import { getIO } from './socket.js';

export function startMockProcessingJob() {
  const io = getIO();
  let progress = 0;
  const totalFrames = 500;

  io.emit('processing:status', { status: 'started', message: 'Video processing started' });

  const interval = setInterval(() => {
    progress += 10;
    const currentFrame = Math.floor((progress / 100) * totalFrames);
    const etaSeconds = Math.max(0, Math.round(((100 - progress) / 10) * 1));

    io.emit('processing:progress', {
      percentage: progress,
      currentFrame,
      totalFrames,
      etaSeconds,
    });

    if (progress >= 100) {
      clearInterval(interval);
      io.emit('processing:status', { status: 'completed', message: 'Video processing completed' });
    }
  }, 1000);
}