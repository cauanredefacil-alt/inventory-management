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

// Get parts statistics
router.get('/stats', async (req, res) => {
    try {
        const collection = db.collection('parts');
        
        // Get total count
        const total = await collection.countDocuments();
        
        // Get counts by status
        const available = await collection.countDocuments({ status: { $in: ['disponivel', 'disponível', 'available'] } });
        const inUse = await collection.countDocuments({ status: { $in: ['em uso', 'em_uso', 'in use', 'in_use'] } });
        const maintenance = await collection.countDocuments({ status: { $in: ['manutencao', 'manutenção', 'maintenance'] } });
        const defective = await collection.countDocuments({ status: { $in: ['com defeito', 'defeito', 'defective', 'com_defeito'] } });
        
        res.json({
            success: true,
            data: {
                total,
                available,
                inUse,
                maintenance,
                defective
            }
        });
    } catch (error) {
        console.error('Error fetching parts statistics:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch parts statistics',
            error: error.message 
        });
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
            updatedAt: new Date(),
            // Add new fields
            processor: req.body.processor || '',
            ram: req.body.ram || '',
            storage: req.body.storage || '',
            location: req.body.location || '',
            user: req.body.user || '',
            machineId: req.body.machineId || ''
        };

        // Add metadata if provided
        if (metadata && typeof metadata === 'object') {
            partData.metadata = metadata;
            
            // Add direct fields for easier querying
            if (metadata.type) partData.type = metadata.type;
            
            // Ensure new fields are included in metadata if not already set
            if (!partData.processor && metadata.processor) partData.processor = metadata.processor;
            if (!partData.ram && metadata.ram) partData.ram = metadata.ram;
            if (!partData.storage && metadata.storage) partData.storage = metadata.storage;
            if (!partData.location && metadata.location) partData.location = metadata.location;
            if (!partData.user && metadata.user) partData.user = metadata.user;
            if (!partData.machineId && metadata.machineId) partData.machineId = metadata.machineId;
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
        res.status(500).json({ message: error.message });
    }
});

// Update an existing part
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, quantity, category, metadata } = req.body;
    
    try {
        // Validate ID
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid part ID' });
        }

        // Log the incoming request for debugging
        console.log(`Updating part ${id} with data:`, {
            name,
            description,
            quantity,
            category,
            metadata
        });

        // Build the update object
        const updateData = {
            $set: {
                ...(name && { name }),
                ...(description && { description }),
                ...(quantity && { quantity: parseInt(quantity) }),
                ...(category && { category }),
                ...(req.body.processor !== undefined && { processor: req.body.processor, 'metadata.specs.processor': req.body.processor }),
                ...(req.body.ram !== undefined && { ram: req.body.ram, 'metadata.specs.ram': req.body.ram }),
                ...(req.body.storage !== undefined && { storage: req.body.storage, 'metadata.specs.storage': req.body.storage }),
                ...(req.body.location !== undefined && { location: req.body.location, 'metadata.location': req.body.location }),
                ...(req.body.user !== undefined && { user: req.body.user, 'metadata.user': req.body.user }),
                ...(req.body.machineId !== undefined && { 
                    machineId: req.body.machineId,
                    'metadata.machineId': req.body.machineId 
                }),
                updatedAt: new Date()
            }
        };

        // Add metadata if provided
        if (metadata && typeof metadata === 'object') {
            updateData.$set.metadata = metadata;
            
            // Update direct fields for easier querying
            if (metadata.type) updateData.$set.type = metadata.type;
            if (metadata.status) updateData.$set.status = metadata.status;
            if (metadata.user) updateData.$set.assignedTo = metadata.user;
            
            // Update machine-specific fields
            if (metadata.type === 'maquina') {
                if (metadata.specs) updateData.$set.specs = metadata.specs;
                if (metadata.machineId !== undefined) {
                    // Set machineId at the root level - this is the key fix
                    updateData.$set.machineId = metadata.machineId;
                }
            }
            
            // Update peripheral-specific fields
            if (metadata.type === 'periferico') {
                if (metadata.brand) updateData.$set.brand = metadata.brand;
                if (metadata.model) updateData.$set.model = metadata.model;
                if (metadata.peripheralType) updateData.$set.peripheralType = metadata.peripheralType;
            }
            
            // Update monitor-specific fields
            if (metadata.type === 'monitor') {
                if (metadata.brand) updateData.$set.brand = metadata.brand;
                if (metadata.model) updateData.$set.model = metadata.model;
                if (metadata.screenSize) updateData.$set.screenSize = metadata.screenSize;
                if (metadata.resolution) updateData.$set.resolution = metadata.resolution;
            }
        }

        console.log('Updating part with data:', updateData);
        const result = await db.collection('parts').updateOne(
            { _id: new ObjectId(id) },
            updateData
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Part not found' });
        }
        
        const updatedPart = await db.collection('parts').findOne({ _id: new ObjectId(id) });
        console.log('Successfully updated part:', updatedPart);
        
        res.json(updatedPart);
    } catch (error) {
        console.error('Error updating part:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete a part
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Validate ID
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid part ID' });
        }
        
        console.log(`Deleting part ${id}`);
        
        const result = await db.collection('parts').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Part not found' });
        }
        
        console.log(`Successfully deleted part ${id}`);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting part:', error);
        res.status(500).json({ message: error.message });
    }
});

// Export the router with the setDatabase function
module.exports = { router, setDatabase };

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
