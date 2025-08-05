require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { router: userRouter, setDatabase: setUserDatabase } = require('./routes/userRoutes');
const { router: partsRouter, setDatabase: setPartsDatabase } = require('./routes/partsRoutes');

const app = express();

// MongoDB Client
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 50,
    wtimeoutMS: 2500
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root directory (HTML, CSS, JS)
app.use(express.static('.'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/assets', express.static('assets'));

// MongoDB Connection
async function connectDB() {
    try {
        await client.connect();
        console.log('MongoDB Connected');
        return client.db('frontend-puro');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        const db = await connectDB();
        // Set database instance in routes
        setUserDatabase(db);
        setPartsDatabase(db);
        
        // Set up API routes
        app.use('/api/users', userRouter);
        app.use('/api/parts', partsRouter);
        
        // Serve the main HTML file for the root route
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
        
        // Handle any other routes by serving the main HTML file (SPA support)
        app.get('*', (req, res) => {
            // Only serve HTML for non-API routes
            if (!req.path.startsWith('/api')) {
                res.sendFile(path.join(__dirname, 'index.html'));
            } else {
                res.status(404).json({ message: 'API endpoint not found' });
            }
        });
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Frontend available at: http://localhost:${PORT}`);
            console.log(`API available at: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();
