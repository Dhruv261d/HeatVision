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
import { initQueueSocket, getJobStatus } from './services/queueService.js';

// 2. Initialize Cloudinary
connectCloudinary();

const app = express();
const PORT = process.env.PORT || 5000;

// 3. Create HTTP Server & Initialize Socket.io (Issue 12)
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Pass Socket.io instance to Queue Service for real-time broadcasts
initQueueSocket(io);

// Security & Logging
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));

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