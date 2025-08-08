require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { router: userRouter, setDatabase: setUserDatabase } = require('./routes/userRoutes');
const { router: partsRouter, setDatabase: setPartsDatabase } = require('./routes/partsRoutes');
const { router: numberRouter } = require('./routes/numberRoutes');

const app = express();


const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 50,
    wtimeoutMS: 2500
});


// Enable CORS with specific options
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Parse JSON bodies
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Middleware to set proper MIME types for static files
const setContentType = (res, path) => {
    if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
};

// Serve static files from the public directory with proper MIME types
app.use('/public', express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: setContentType
}));

// Serve static files from the root directory (for backward compatibility)
app.use(express.static(__dirname, {
    setHeaders: setContentType
}));


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


const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        const db = await connectDB();
        
        setUserDatabase(db);
        setPartsDatabase(db);
        
        
        // API Routes
        app.use('/api/users', userRouter);
        app.use('/api/parts', partsRouter);
        app.use('/api/numbers', numberRouter); // Changed from '/api' to be more specific
        
        // Test route
        app.get('/api/test', (req, res) => {
            console.log('Test endpoint hit');
            res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
        });
        
        console.log('Registered routes:');
        console.log('- GET /api/parts');
        console.log('- GET /api/test');
        
        
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
        
        
        app.get('*', (req, res) => {
            
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


startServer();
