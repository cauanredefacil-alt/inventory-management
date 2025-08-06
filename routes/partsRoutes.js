const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');


let db;


const setDatabase = (database) => {
    db = database;
};


router.get('/', async (req, res) => {
    try {
        const parts = await db.collection('parts').find({}).toArray();
        

        const processedParts = parts.map(part => {

            if (part.metadata && part.metadata.user && !part.user) {
                part.user = part.metadata.user;
            }

            if (part.assignedTo && !part.user) {
                part.user = part.assignedTo;
            }
            return part;
        });
        
        res.json(processedParts);
    } catch (error) {
        console.error('Error fetching parts:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create new part
router.post('/', async (req, res) => {
    const { name, description, quantity, category, metadata } = req.body;
    
    try {
        // Log the incoming request for debugging
        console.log('Creating new part with data:', {
            name,
            description,
            quantity,
            category,
            metadata
        });

        // Build the part object with all provided fields
        const partData = {
            name,
            description: description || '',
            quantity: parseInt(quantity) || 0,
            category: category || 'Geral',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add metadata if provided
        if (metadata && typeof metadata === 'object') {
            partData.metadata = metadata;
            
            // Add direct fields for easier querying
            if (metadata.type) partData.type = metadata.type;
            if (metadata.status) partData.status = metadata.status;
            if (metadata.user) partData.assignedTo = metadata.user;
            
            // Add machine-specific fields
            if (metadata.type === 'maquina' && metadata.specs) {
                partData.specs = metadata.specs;
                if (metadata.machineId) partData.machineId = metadata.machineId;
            }
            
            // Add peripheral-specific fields
            if (metadata.type === 'periferico') {
                if (metadata.brand) partData.brand = metadata.brand;
                if (metadata.model) partData.model = metadata.model;
                if (metadata.peripheralType) partData.peripheralType = metadata.peripheralType;
            }
            
            // Add monitor-specific fields
            if (metadata.type === 'monitor') {
                if (metadata.brand) partData.brand = metadata.brand;
                if (metadata.model) partData.model = metadata.model;
                if (metadata.screenSize) partData.screenSize = metadata.screenSize;
                if (metadata.resolution) partData.resolution = metadata.resolution;
            }
        }

        console.log('Inserting part with data:', partData);
        const result = await db.collection('parts').insertOne(partData);
        
        const newPart = await db.collection('parts').findOne({ _id: result.insertedId });
        console.log('Successfully created part:', newPart);
        
        res.status(201).json(newPart);
    } catch (error) {
        console.error('Error creating part:', error);
        res.status(400).json({ 
            message: 'Failed to create part',
            error: error.message 
        });
    }
});

// Get single part
router.get('/:id', async (req, res) => {
    try {
        const part = await db.collection('parts').findOne({ _id: new ObjectId(req.params.id) });
        if (!part) {
            return res.status(404).json({ message: 'Cannot find part' });
        }
        res.json(part);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update part
router.patch('/:id', async (req, res) => {
    const { name, description, quantity, category } = req.body;

    try {
        const updateData = {
            updatedAt: new Date()
        };
        
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (quantity !== undefined) updateData.quantity = parseInt(quantity);
        if (category) updateData.category = category;

        const result = await db.collection('parts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Cannot find part' });
        }

        const updatedPart = await db.collection('parts').findOne({ _id: new ObjectId(req.params.id) });
        res.json(updatedPart);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete part
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.collection('parts').deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Cannot find part' });
        }

        res.json({ message: 'Part deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Stock operations (add/remove stock)
router.post('/:id/stock', async (req, res) => {
    const { action, quantity, notes } = req.body;
    
    if (!['add', 'remove', 'set'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action. Must be "add", "remove", or "set"' });
    }
    
    if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    try {
        const part = await db.collection('parts').findOne({ _id: new ObjectId(req.params.id) });
        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        let newQuantity = part.quantity;
        
        if (action === 'add') {
            newQuantity += quantity;
        } else if (action === 'remove') {
            if (part.quantity < quantity) {
                return res.status(400).json({ 
                    message: 'Insufficient stock', 
                    currentStock: part.quantity 
                });
            }
            newQuantity -= quantity;
        } else if (action === 'set') {
            newQuantity = quantity;
        }

        // Update the part with new quantity
        const result = await db.collection('parts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $set: { 
                    quantity: newQuantity,
                    updatedAt: new Date() 
                },
                $push: {
                    stockHistory: {
                        action,
                        quantity,
                        previousQuantity: part.quantity,
                        newQuantity,
                        notes: notes || '',
                        date: new Date(),
                        userId: req.user?.id || 'system' // Assuming you have user authentication
                    }
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Failed to update stock' });
        }

        const updatedPart = await db.collection('parts').findOne({ _id: new ObjectId(req.params.id) });
        res.json({
            message: 'Stock updated successfully',
            part: updatedPart
        });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ message: 'Error updating stock', error: error.message });
    }
});

// Get stock history for a part
router.get('/:id/stock-history', async (req, res) => {
    try {
        const part = await db.collection('parts').findOne(
            { _id: new ObjectId(req.params.id) },
            { projection: { stockHistory: 1 } }
        );
        
        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }
        
        res.json(part.stockHistory || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Export routes and database setter
module.exports = { router, setDatabase };
