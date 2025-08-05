const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// Get the MongoDB client instance from server.js
let db;

// Middleware to set the database instance
const setDatabase = (database) => {
    db = database;
};

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await db.collection('users').find({}).toArray();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new user
router.post('/', async (req, res) => {
    const { name, email } = req.body;

    try {
        const result = await db.collection('users').insertOne({
            name,
            email,
            createdAt: new Date()
        });
        res.status(201).json(result.ops[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get single user
router.get('/:id', async (req, res) => {
    try {
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
        if (!user) {
            return res.status(404).json({ message: 'Cannot find user' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.patch('/:id', async (req, res) => {
    const { name, email } = req.body;

    try {
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { name, email } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Cannot find user' });
        }

        const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Cannot find user' });
        }

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Export routes and database setter
module.exports = { router, setDatabase };
