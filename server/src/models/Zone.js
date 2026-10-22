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
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["shelf", "aisle", "billing", "entrance", "custom"],
      default: "shelf",
    },
    shape: {
      type: String,
      enum: ["rectangle", "polygon"],
      default: "polygon",
    },
    points: {
      type: [[Number]],
      required: true,
      validate: {
        validator: function (pts) {
          return Array.isArray(pts) && pts.length >= 3;
        },
        message: "A zone must have at least 3 points",
      },
    },
  },
  {
    timestamps: true,
  },
);

zoneSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.blueprintId = ret.blueprintId?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Zone = mongoose.model("Zone", zoneSchema);

export default Zone;
