import mongoose from 'mongoose';

const machineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  machineID: { type: Number, required: true, unique: true },
  // URL base do agente de wallpaper desta máquina (ex.: http://DESKTOP01:8002)
  agentUrl: { type: String },
  category: { 
    type: String, 
    required: true,
    enum: ['máquina', 'periférico', 'monitor']
  },
  status: {
    type: String,
    required: true,
    enum: ['em uso', 'manutenção', 'disponível']
  },
  // Campos específicos para máquinas
  processor: { type: String },
  ram: { 
    type: String,
    enum: ['4GB', '6GB', '8GB', '16GB', '32GB', null]
  },
  storage: {
    type: String,
    enum: [
      '120GB SSD', '240GB SSD', '480GB SSD', '1TB SSD',
      '500GB HD', '1TB HD', '2TB HD', null
    ]
  },
  location: {
    type: String,
    enum: [
      'SETOR MNT - SALA LINK', 'SETOR MKT - SALA LINK', 'SETOR BKO - SALA LINK', 
      'OPERACIONAL', 'COMERCIAL', 'RH', 'FINANCEIRO', null
    ]
  },
  user: { type: String },
  // Campo para outros tipos de dispositivos
  description: { type: String }
}, { timestamps: true });

export default mongoose.model('Machine', machineSchema);
