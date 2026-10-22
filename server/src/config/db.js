import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore if custom dns servers cannot be set
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[database]: MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[database]: Connection Error: ${error.message}`);
    // Don't kill the server on connection error so local mock/offline workflows continue
    console.warn('[database]: Continuing in offline/fallback mode...');
  }
};


export default connectDB;