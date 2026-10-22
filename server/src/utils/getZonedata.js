import mongoose from "mongoose";
import Store from "../models/Store.js";
import Floorplan from "../models/Floorplan.js";
import Zone from "../models/Zone.js";

const getZonedata = async (arg1, arg2) => {
  try {
    let storeId, floorplanId;
    if (arg1 && typeof arg1 === "object" && !mongoose.isValidObjectId(arg1)) {
      storeId = arg1.storeId;
      floorplanId = arg1.floorplanId;
    } else {
      storeId = arg1;
      floorplanId = arg2;
    }

    if (!storeId || !mongoose.isValidObjectId(storeId)) {
      return [];
    }

    const store = await Store.findById(storeId);

    if (!store || !store.isActive) {
      return [];
    }

    const filter = { storeId };

    if (floorplanId) {
      if (!mongoose.isValidObjectId(floorplanId)) {
        return [];
      }

      // Ensure the requested floorplan belongs to this store
      const floorplan = await Floorplan.findOne({
        _id: floorplanId,
        storeId,
      });

      if (!floorplan) {
        return [];
      }

      filter.floorplanId = floorplanId;
    }

    const zones = await Zone.find(filter).sort({ createdAt: 1 }).lean();

    return zones || [];
  } catch (error) {
    console.error("getZonedata error:", error);
    return [];
  }
};

export { getZonedata };
