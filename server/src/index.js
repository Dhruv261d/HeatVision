import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import connectCloudinary from './config/cloudinary.js';
import videoRoutes from './routes/videoRoutes.js';
import { initSocket } from './socket.js';
import { startMockProcessingJob } from './mockJob.js';

dotenv.config();

connectCloudinary();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'HeatVision API Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/test/start-job', (req, res) => {
  startMockProcessingJob();
  res.json({ message: 'Mock job started, watch the socket events' });
});

app.get('/', (req, res) => {
  res.send('HeatVision API Server');
});

// Video Routes
app.use('/api/videos', videoRoutes);

const httpServer = createServer(app);
initSocket(httpServer);

// TEMPORARY: server starts even if MongoDB isn't reachable yet.
// Remove this bypass once Dhruv whitelists your IP in Atlas Network Access.
httpServer.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});

connectDB().catch((err) => {
  console.error('[database]: Failed to connect to MongoDB (server is still running without it):', err.message);
});