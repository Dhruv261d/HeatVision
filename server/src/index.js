import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 1. Load env variables first
dotenv.config();

import connectDB from './config/db.js';
import connectCloudinary from './config/cloudinary.js';
import videoRoutes from './routes/videoRoutes.js';
import caligraphyRoutes from './routes/caligraphyRoutes.js';
import blueprintRoutes from './routes/blueprintRoutes.js';
import heatmapRoutes from './routes/heatmapRoutes.js';
import { initQueueSocket, getJobStatus } from './services/queueService.js';



import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Initialize Cloudinary
connectCloudinary();

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS origin checker to support Vite on port 5173, 5174, etc.
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

// 3. Create HTTP Server & Initialize Socket.io (Issue 12)
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Pass Socket.io instance to Queue Service for real-time broadcasts
initQueueSocket(io);

// Security & Logging
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors(corsOptions));
app.use(morgan('dev'));

// Static uploads serving for annotated debug videos and generated dual heatmaps
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/uploads/heatmaps', express.static(path.resolve(__dirname, '../uploads/heatmaps')));
app.use('/data/uploads', express.static(path.resolve(__dirname, '../../data/uploads')));
app.use('/data/processed', express.static(path.resolve(__dirname, '../../data/processed')));

// Express body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'HeatVision API Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Job Queue Status Query Route (Issue 11)
app.get('/api/jobs/:id', (req, res) => {
  const job = getJobStatus(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }
  return res.status(200).json({ success: true, job });
});

// Root Route
app.get('/', (req, res) => {
  res.send('HeatVision API Server');
});

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/caligraphy', caligraphyRoutes);
app.use('/api/calibrate', caligraphyRoutes);
app.use('/api/calibration', caligraphyRoutes);
app.use('/api/blueprints', blueprintRoutes);
app.use('/api/zones', blueprintRoutes);
app.use('/api/heatmap', heatmapRoutes);



// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[error]:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start DB and Express/Socket.io Server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[server]: Server & Socket.io running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[database]: Failed to connect to MongoDB', err);
    process.exit(1);
  });