import mongoose from 'mongoose';

const ChipSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      trim: true,
      match: [/^\d{1,3}$/i, 'IP deve conter de 1 a 3 dígitos'],
      required: true,
    },
    number: { type: String, required: true, trim: true },
    carrier: { type: String, enum: ['Vivo', 'Tim', 'Claro', 'Oi'], required: true },
    consultant: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Ativo', 'Ativo/Aracaju', 'Aguardando Análise', 'Banido', 'Inativo', 'Maturado', 'Recarga Pendente'],
      required: true,
    },
  },
  { timestamps: true }
);

const Chip = mongoose.model('Chip', ChipSchema);
export default Chip;
