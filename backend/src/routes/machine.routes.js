import express from 'express';
import Machine from '../models/machine.model.js';

const router = express.Router();

// Criar item
router.post('/', async (req, res) => {
  try {
    const machine = new Machine(req.body);
    await machine.save();
    res.status(201).json(machine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar itens
router.get('/', async (req, res) => {
  try {
    const machines = await Machine.find();
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar itens' });
  }
});

// Obter item por ID
router.get('/:id', async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) return res.status(404).json({ error: 'Item não encontrado' });
    res.json(machine);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar item' });
  }
});

// Atualizar item
router.put('/:id', async (req, res) => {
  try {
    const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!machine) return res.status(404).json({ error: 'Item não encontrado' });
    res.json(machine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Deletar item
router.delete('/:id', async (req, res) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) return res.status(404).json({ error: 'Item não encontrado' });
    res.json({ message: 'Item removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover item' });
  }
});

export default router;
