import express from "express";
import {
  createZone,
  getZones,
  deleteZone,
} from "../controllers/zoneController.js";
const router = express.Router();

router.post("/:storeId", createZone);
router.get("/:storeId", getZones);
router.delete("/:storeId/:zoneId", deleteZone);

export default router;
