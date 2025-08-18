import express from 'express';
import User from '../models/user.model.js';
import Machine from '../models/machine.model.js';

const router = express.Router();

// Listar usuários
router.get('/', async (_req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários', detail: err.message });
  }
});

// Criar usuário
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const user = new User({ name: String(name).trim(), email: email ? String(email).trim() : undefined });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Usuário já existe (nome duplicado)' });
    }
    res.status(500).json({ error: 'Erro ao criar usuário', detail: err.message });
  }
});

// Migrar usuários distintos do campo Machine.user para a coleção users
router.post('/migrate-from-machines', async (_req, res) => {
  try {
    // Obter valores distintos não vazios
    const distinctUsers = (await Machine.distinct('user'))
      .filter(u => typeof u === 'string')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (distinctUsers.length === 0) {
      return res.json({ ok: true, inserted: 0, upserted: [], message: 'Nenhum usuário encontrado em machines.' });
    }

    // Upsert em massa para evitar duplicidades
    const ops = distinctUsers.map(name => ({
      updateOne: {
        filter: { name },
        update: { $setOnInsert: { name } },
        upsert: true,
      }
    }));

    const result = await User.bulkWrite(ops, { ordered: false });
    const inserted = (result.upsertedCount) || 0;

    res.json({ ok: true, inserted, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Erro na migração de usuários', detail: err.message });
  }
});

export default router;
