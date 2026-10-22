import mongoose from "mongoose";
import Store from "../models/Store.js";
import Floorplan from "../models/Floorplan.js";
import Zone from "../models/Zone.js";
import { getZonedata } from "../utils/getZonedata.js";

// Create a zone for a floorplan belonging to a store
export const createZone = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { floorplanId, name, type = "custom", points } = req.body;

    // Validate IDs
    if (
      !mongoose.isValidObjectId(storeId) ||
      !mongoose.isValidObjectId(floorplanId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid storeId or floorplanId",
      });
    }

    // Validate required fields
    if (!name?.trim() || !Array.isArray(points) || points.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name and at least 3 polygon points are required",
      });
    }

    const allowedTypes = ["shelf", "aisle", "billing", "entrance", "custom"];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid zone type",
      });
    }

    // Validate normalized coordinates (0 to 1)
    const validPoints = points.every(
      ({ x, y }) =>
        typeof x === "number" &&
        typeof y === "number" &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 0 &&
        x <= 1 &&
        y >= 0 &&
        y <= 1,
    );

    if (!validPoints) {
      return res.status(400).json({
        success: false,
        message:
          "Each point must have numeric x and y coordinates between 0 and 1",
      });
    }

    // Ensure the store exists
    const store = await Store.findById(storeId);

    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: "Store not found or inactive",
      });
    }

    // Ensure the floorplan belongs to this store
    const floorplan = await Floorplan.findOne({
      _id: floorplanId,
      storeId,
      isActive: true,
    });

    if (!floorplan) {
      return res.status(404).json({
        success: false,
        message: "Active floorplan not found for this store",
      });
    }

    const zone = await Zone.create({
      storeId,
      floorplanId,
      name: name.trim(),
      type,
      points,
    });

    return res.status(201).json({
      success: true,
      message: "Zone created successfully",
      zone,
    });
  } catch (error) {
    console.error("createZone error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create zone",
    });
  }
};

// Get all zones belonging to a store
// Optionally filter by floorplanId
export const getZones = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { floorplanId } = req.query;

    if (!mongoose.isValidObjectId(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid storeId",
      });
    }

    const store = await Store.findById(storeId);

    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: "Store not found or inactive",
      });
    }

    const filter = { storeId };

    if (floorplanId) {
      if (!mongoose.isValidObjectId(floorplanId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid floorplanId",
        });
      }

      // Ensure the requested floorplan belongs to this store
      const floorplan = await Floorplan.findOne({
        _id: floorplanId,
        storeId,
      });

      if (!floorplan) {
        return res.status(404).json({
          success: false,
          message: "Floorplan not found for this store",
        });
      }

      filter.floorplanId = floorplanId;
    }

    const zones = (await getZonedata({ storeId, floorplanId })) || [];

    return res.status(200).json({
      success: true,
      count: zones.length,
      zones,
    });
  } catch (error) {
    console.error("getZones error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch zones",
    });
  }
};

// Delete a zone belonging to a store
export const deleteZone = async (req, res) => {
  try {
    const { storeId, zoneId } = req.params;

    if (
      !mongoose.isValidObjectId(storeId) ||
      !mongoose.isValidObjectId(zoneId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid storeId or zoneId",
      });
    }

    const store = await Store.findById(storeId);

    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: "Store not found or inactive",
      });
    }

    // Delete only if the zone belongs to this store
    const zone = await Zone.findOneAndDelete({
      _id: zoneId,
      storeId,
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found for this store",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Zone deleted successfully",
      zoneId: zone._id,
    });
  } catch (error) {
    console.error("deleteZone error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete zone",
    });
  }
};
