const mongoose = require('mongoose');

// Check if model is already compiled
let TelSistema;

try {
    // Try to get the existing model to avoid OverwriteModelError
    TelSistema = mongoose.model('TelSistema');
} catch (e) {
    // Model doesn't exist, define it
    const telSistemaSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['WhatsApp Business', 'WhatsApp Pessoal', 'Telefone Fixo', 'Outro'],
    default: 'WhatsApp Business'
  },
  plataforma: {
    type: String,
    required: true,
    enum: ['Android', 'iOS', 'Web', 'API'],
    default: 'Android'
  },
  status: {
    type: String,
    required: true,
    enum: ['Ativo', 'Em Uso', 'Manutenção', 'Inativo'],
    default: 'Ativo'
  },
  chipVinculado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chip'
  },
  dispositivo: {
    tipo: String,
    modelo: String,
    imei: String
  },
  configuracoes: {
    tipo: String,
    usuario: String,
    senha: String
  },
  observacoes: {
    type: String,
    trim: true
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  atualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
telSistemaSchema.index({ numero: 1 });
telSistemaSchema.index({ status: 1 });
telSistemaSchema.index({ tipo: 1 });
telSistemaSchema.index({ plataforma: 1 });

    // Add timestamps
    telSistemaSchema.set('timestamps', true);
    
    // Create the model
    TelSistema = mongoose.model('TelSistema', telSistemaSchema);
}

module.exports = TelSistema;
