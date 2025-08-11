import express from 'express';
import Product from '../models/product.model.js';

const router = express.Router();

// Criar produto
router.post('/', async (req, res) => {
  try {
    console.log('POST /api/products body:', req.body);
    if (!req.body.name || req.body.quantity === undefined || req.body.price === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, quantity, price' });
    }
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    res.status(400).json({ error: err.message });
  }
});

// Listar produtos
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter produto por ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar produto
router.put('/:id', async (req, res) => {
  try {
    console.log('PUT /api/products/' + req.params.id, 'body:', req.body);
    if (!req.body.name || req.body.quantity === undefined || req.body.price === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, quantity, price' });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(400).json({ error: err.message });
  }
});

// Deletar produto
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ message: 'Produto deletado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
