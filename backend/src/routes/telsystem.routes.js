import express from 'express';
import TelSystem from '../models/telsystem.model.js';

const router = express.Router();

// Criar
router.post('/', async (req, res) => {
  try {
    const tel = new TelSystem(req.body);
    await tel.save();
    res.status(201).json(tel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar
router.get('/', async (_req, res) => {
  try {
    const list = await TelSystem.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar Tel Sistemas' });
  }
});

// Obter por ID
router.get('/:id', async (req, res) => {
  try {
    const tel = await TelSystem.findById(req.params.id);
    if (!tel) return res.status(404).json({ error: 'Registro não encontrado' });
    res.json(tel);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar registro' });
  }
});

// Atualizar
router.put('/:id', async (req, res) => {
  try {
    const tel = await TelSystem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tel) return res.status(404).json({ error: 'Registro não encontrado' });
    res.json(tel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remover
router.delete('/:id', async (req, res) => {
  try {
    const tel = await TelSystem.findByIdAndDelete(req.params.id);
    if (!tel) return res.status(404).json({ error: 'Registro não encontrado' });
    res.json({ message: 'Registro removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover registro' });
  }
});

export default router;
