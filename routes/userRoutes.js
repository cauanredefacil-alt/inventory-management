const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');


let db;


const setDatabase = (database) => {
    db = database;
};


router.get('/', async (req, res) => {
    try {
        const users = await db.collection('users').find({}).toArray();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


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


module.exports = { router, setDatabase };
