import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  uploadPOSFile,
  getUploads,
  getTransactions,
  generateSynthetic,
  downloadSampleCSV,
} from "../controllers/posController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Temporary storage for incoming POS CSV uploads
const tempDir = path.resolve(__dirname, "../../uploads/temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `pos_${Date.now()}_${basename}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Routes
router.post("/upload", upload.single("file"), uploadPOSFile);
router.get("/uploads", getUploads);
router.get("/transactions", getTransactions);
router.post("/generate-synthetic", generateSynthetic);
router.get("/download-sample", downloadSampleCSV);

export default router;

