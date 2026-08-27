import mongoose from 'mongoose';
import dotenv from 'dotenv'
dotenv.config()

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[database]: MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[database]: Connection Error: ${error.message}`);
    // NOTE: removed process.exit(1) temporarily so the server can run
    // without MongoDB while waiting on Atlas IP whitelist access.
    // Restore this once DB access is confirmed working.
    throw error;
  }
};

export default connectDB;