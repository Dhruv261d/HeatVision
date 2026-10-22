import mongoose from 'mongoose';

const blueprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    storeName: {
      type: String,
      default: 'Main Retail Store',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Transform _id to id for cleaner API responses matching ZoneEditor props
blueprintSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Blueprint = mongoose.model('Blueprint', blueprintSchema);

export default Blueprint;
