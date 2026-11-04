import mongoose from "mongoose";

const posUploadSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedOn: {
      type: Date,
      default: Date.now,
    },
    fileSize: {
      type: String,
      default: "0 KB",
    },
    recordsCount: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      default: 100,
    },
    status: {
      type: String,
      enum: ["Processing", "Completed", "Failed"],
      default: "Completed",
    },
    summary: {
      totalRevenue: {
        type: Number,
        default: 0,
      },
      totalItemsSold: {
        type: Number,
        default: 0,
      },
      zoneSales: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },
  },
  {
    timestamps: true,
  }
);

posUploadSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.uploadedOn = ret.uploadedOn
      ? new Date(ret.uploadedOn).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Just now";
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const POSUpload = mongoose.model("POSUpload", posUploadSchema);

export default POSUpload;

