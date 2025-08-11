import express from 'express';
import Chip from '../models/chip.model.js';

const router = express.Router();

// Criar
router.post('/', async (req, res) => {
  try {
    const chip = new Chip(req.body);
    await chip.save();
    res.status(201).json(chip);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar
router.get('/', async (_req, res) => {
  try {
    const chips = await Chip.find().sort({ createdAt: -1 });
    res.json(chips);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar chips' });
  }
});

// Obter por ID
router.get('/:id', async (req, res) => {
  try {
    const chip = await Chip.findById(req.params.id);
    if (!chip) return res.status(404).json({ error: 'Chip não encontrado' });
    res.json(chip);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar chip' });
  }
});

// Atualizar
router.put('/:id', async (req, res) => {
  try {
    const chip = await Chip.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!chip) return res.status(404).json({ error: 'Chip não encontrado' });
    res.json(chip);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remover
router.delete('/:id', async (req, res) => {
  try {
    const chip = await Chip.findByIdAndDelete(req.params.id);
    if (!chip) return res.status(404).json({ error: 'Chip não encontrado' });
    res.json({ message: 'Chip removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover chip' });
  }
});

export default router;
