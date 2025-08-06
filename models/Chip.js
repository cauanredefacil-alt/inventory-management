const mongoose = require('mongoose');

// Check if model is already compiled
let Chip;

try {
    // Try to get the existing model to avoid OverwriteModelError
    Chip = mongoose.model('Chip');
} catch (e) {
    // Model doesn't exist, define it
    const chipSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  operadora: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Ativo', 'Ativo/Aracaju', 'Aguardando Análise', 'Banido', 'Inativo', 'Maturado', 'Recarga Pendente'],
    default: 'Aguardando Análise'
  },
  ip: {
    type: String,
    trim: true
  },
  consultor: {
    type: String,
    trim: true
  },
  dataAtivacao: {
    type: Date,
    default: Date.now
  },
  dataExpiracao: {
    type: Date
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
chipSchema.index({ numero: 1 });
chipSchema.index({ status: 1 });
chipSchema.index({ operadora: 1 });

    // Add timestamps
    chipSchema.set('timestamps', true);
    
    // Create the model
    Chip = mongoose.model('Chip', chipSchema);
}

module.exports = Chip;
