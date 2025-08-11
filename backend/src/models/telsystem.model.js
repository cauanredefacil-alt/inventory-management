import mongoose from 'mongoose';

const TelSystemSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ['Wtt1', 'Wtt2', 'Wtt1 -clone', 'Wtt2 -clone', 'Business', 'Business -clone'],
      // optional: can be set later via assignment modal
      required: false,
      default: undefined,
    },
    consultant: { 
      type: String, 
      trim: true,
      // optional: can be set later via assignment modal
      required: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

const TelSystem = mongoose.model('TelSystem', TelSystemSchema);
export default TelSystem;
