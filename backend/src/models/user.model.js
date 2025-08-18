import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: false, trim: true, lowercase: true },
    // você pode expandir com mais campos conforme a necessidade
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
