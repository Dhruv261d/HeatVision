import mongoose from "mongoose";

const posTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    zoneId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    zoneName: {
      type: String,
      default: "",
      trim: true,
    },
    productCategory: {
      type: String,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    uploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "POSUpload",
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Format for frontend / JSON serialization
posTransactionSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.date = ret.timestamp ? new Date(ret.timestamp).toISOString().split("T")[0] : "";
    ret.time = ret.timestamp ? new Date(ret.timestamp).toTimeString().split(" ")[0] : "";
    ret.product = ret.itemName;
    ret.category = ret.productCategory;
    ret.zone = ret.zoneName || ret.zoneId;
    ret.price = ret.totalAmount;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const POSTransaction = mongoose.model("POSTransaction", posTransactionSchema);

export default POSTransaction;

