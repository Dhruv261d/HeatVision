import mongoose from "mongoose";
const zoneSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    floorplanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floorplan",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["shelf", "aisle", "billing", "entrance", "custom"],
      default: "custom",
    },
    points: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

const Zone = mongoose.model("Zone", zoneSchema);
export default Zone;
