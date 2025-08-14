import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 1,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Location', LocationSchema);
