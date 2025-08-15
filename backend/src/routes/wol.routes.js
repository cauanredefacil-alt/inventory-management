import express from 'express';
import wol from 'wol';

const router = express.Router();

// POST /api/wol
// Body: { mac: string, broadcast?: string }
// Example broadcast: 255.255.255.255 or rede específica (ex: 192.168.1.255)
router.post('/', async (req, res) => {
  try {
    const { mac, broadcast } = req.body || {};
    if (!mac || typeof mac !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "mac" é obrigatório.' });
    }

    // Normaliza MAC
    const cleanedMac = String(mac).trim();
    if (!/^[0-9A-Fa-f:.-]{12,17}$/.test(cleanedMac)) {
      return res.status(400).json({ error: 'MAC inválido.' });
    }

    const opts = {};
    if (broadcast && typeof broadcast === 'string') {
      opts.address = broadcast.trim();
    }

    await new Promise((resolve, reject) => {
      wol.wake(cleanedMac, opts, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return res.json({ ok: true, mac: cleanedMac, address: opts.address || '255.255.255.255' });
  } catch (err) {
    console.error('Erro ao enviar WOL:', err);
    return res.status(500).json({ error: 'Falha ao enviar pacote WOL.' });
  }
});

export default router;
