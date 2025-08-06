const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/frontend-puro', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Import models
const Chip = require('../models/Chip');
const TelSistema = require('../models/TelSistema');

// Add error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware to handle errors
const handleErrors = (res, error) => {
    console.error('Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Erro no servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

// ========== Chip Routes ==========

// Get all chips
router.get('/chips', async (req, res) => {
    try {
        console.log('Fetching chips from database...');
        // Make sure the model is properly registered
        if (!mongoose.models.Chip) {
            console.error('Chip model is not registered!');
            return res.status(500).json({ 
                success: false, 
                message: 'Database model error' 
            });
        }
        
        const chips = await Chip.find({}).sort({ dataAtivacao: -1 });
        console.log(`Found ${chips.length} chips`);
        res.json({ success: true, data: chips });
    } catch (error) {
        console.error('Error in /chips endpoint:', error);
        handleErrors(res, error);
    }
});

// Get a single chip by ID
router.get('/chips/:id', async (req, res) => {
    try {
        const chip = await Chip.findById(req.params.id);
        if (!chip) {
            return res.status(404).json({ success: false, message: 'Chip não encontrado' });
        }
        res.json({ success: true, data: chip });
    } catch (error) {
        handleErrors(res, error);
    }
});

// Create a new chip
router.post('/chips', [
    body('numero').notEmpty().withMessage('Número é obrigatório'),
    body('operadora').notEmpty().withMessage('Operadora é obrigatória'),
    body('status').notEmpty().withMessage('Status é obrigatório'),
    body('ip').optional({ checkFalsy: true }).isIP().withMessage('IP inválido'),
    body('consultor').optional({ checkFalsy: true }).trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        // Create a new chip with the request data
        const chipData = { ...req.body };
        
        // Only set criadoPor if we have a valid user
        if (req.user?._id) {
            chipData.criadoPor = req.user._id;
        } else {
            // If no user is authenticated, create a new ObjectId
            // This is a workaround - in a production app, you'd want proper authentication
            chipData.criadoPor = new mongoose.Types.ObjectId();
        }
        
        const newChip = new Chip(chipData);
        
        const savedChip = await newChip.save();
        res.status(201).json({ success: true, data: savedChip });
    } catch (error) {
        console.error('Error creating chip:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'Já existe um chip com este número',
                error: error.message
            });
        }
        
        // Log the complete error for debugging
        console.error('Complete error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // Return more detailed error information
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            return res.status(400).json({
                success: false,
                message: 'Erro de validação',
                errors
            });
        }
        
        handleErrors(res, error);
    }
});

// Update a chip
router.put('/chips/:id', async (req, res) => {
    try {
        const updatedChip = await Chip.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        
        if (!updatedChip) {
            return res.status(404).json({ success: false, message: 'Chip não encontrado' });
        }
        
        res.json({ success: true, data: updatedChip });
    } catch (error) {
        handleErrors(res, error);
    }
});

// Delete a chip
router.delete('/chips/:id', async (req, res) => {
    try {
        const deletedChip = await Chip.findByIdAndDelete(req.params.id);
        
        if (!deletedChip) {
            return res.status(404).json({ success: false, message: 'Chip não encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Chip excluído com sucesso',
            data: { id: deletedChip._id }
        });
    } catch (error) {
        handleErrors(res, error);
    }
});

// ========== TelSistema Routes ==========

// Get all telephone systems
router.get('/tel-sistemas', async (req, res) => {
    try {
        const telSistemas = await TelSistema.find({})
            .populate('chipVinculado', 'numero operadora status')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: telSistemas });
    } catch (error) {
        handleErrors(res, error);
    }
});

// Get a single telephone system by ID
router.get('/tel-sistemas/:id', async (req, res) => {
    try {
        const telSistema = await TelSistema.findById(req.params.id)
            .populate('chipVinculado', 'numero operadora status');
            
        if (!telSistema) {
            return res.status(404).json({ success: false, message: 'Sistema telefônico não encontrado' });
        }
        
        res.json({ success: true, data: telSistema });
    } catch (error) {
        handleErrors(res, error);
    }
});

// Create a new telephone system
router.post('/tel-sistemas', [
    body('numero').notEmpty().withMessage('Número é obrigatório'),
    body('tipo').isIn(['WhatsApp Business', 'WhatsApp Pessoal', 'Telefone Fixo', 'Outro'])
        .withMessage('Tipo inválido'),
    body('plataforma').isIn(['Android', 'iOS', 'Web', 'API'])
        .withMessage('Plataforma inválida'),
    body('status').isIn(['Ativo', 'Em Uso', 'Manutenção', 'Inativo'])
        .withMessage('Status inválido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        // Create a new telSistema with the request data
        const telSistemaData = { ...req.body };
        
        // Only set criadoPor if we have a valid user
        if (req.user?._id) {
            telSistemaData.criadoPor = req.user._id;
        } else {
            // If no user is authenticated, create a new ObjectId
            // This is a workaround - in a production app, you'd want proper authentication
            telSistemaData.criadoPor = new mongoose.Types.ObjectId();
        }
        
        const newTelSistema = new TelSistema(telSistemaData);
        const savedTelSistema = await newTelSistema.save();
        
        // Populate the chipVinculado field for the response
        const populatedTelSistema = await TelSistema.findById(savedTelSistema._id)
            .populate('chipVinculado', 'numero operadora status');
            
        res.status(201).json({ success: true, data: populatedTelSistema });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'Já existe um sistema com este número' 
            });
        }
        handleErrors(res, error);
    }
});

// Update a telephone system
router.put('/tel-sistemas/:id', async (req, res) => {
    try {
        const updatedTelSistema = await TelSistema.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('chipVinculado', 'numero operadora status');
        
        if (!updatedTelSistema) {
            return res.status(404).json({ success: false, message: 'Sistema telefônico não encontrado' });
        }
        
        res.json({ success: true, data: updatedTelSistema });
    } catch (error) {
        handleErrors(res, error);
    }
});

// Delete a telephone system
router.delete('/tel-sistemas/:id', async (req, res) => {
    try {
        const deletedTelSistema = await TelSistema.findByIdAndDelete(req.params.id);
        
        if (!deletedTelSistema) {
            return res.status(404).json({ success: false, message: 'Sistema telefônico não encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Sistema telefônico excluído com sucesso',
            data: { id: deletedTelSistema._id }
        });
    } catch (error) {
        handleErrors(res, error);
    }
});

module.exports = { router };
