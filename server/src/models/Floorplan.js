import mongoose from "mongoose";

const floorplanSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      url: {
        type: String,
        required: true,
      },

      publicId: {
        type: String,
        required: true,
      },

      width: {
        type: Number,
        required: true,
        min: 1,
      },

      height: {
        type: Number,
        required: true,
        min: 1,
      },

      format: {
        type: String,
        default: null,
      },
    },

    coordinateSystem: {
      type: String,
      enum: ["normalized"],
      default: "normalized",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

floorplanSchema.index({ storeId: 1, name: 1 });

const Floorplan = mongoose.model("Floorplan", floorplanSchema);

export default Floorplan;
