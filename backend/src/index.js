import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import machineRoutes from './routes/machine.routes.js';
import chipRoutes from './routes/chip.routes.js';
import telSystemRoutes from './routes/telsystem.routes.js';
import productRoutes from './routes/product.routes.js';
import locationRoutes from './routes/location.routes.js';
import wolRoutes from './routes/wol.routes.js';

dotenv.config();

const app = express();

// CORS configuration to allow access from any origin in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Matches any IP in 192.168.x.x range
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Matches any IP in 10.x.x.x range
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Matches any IP in 172.16.0.0 - 172.31.255.255 range
    ];

    // Check if the origin matches any of the allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    callback(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Enable pre-flight for all routes
app.options('*', cors(corsOptions));
app.use(express.json());

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Tempo menor para timeout
      socketTimeoutMS: 45000, 
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Encerra o processo em caso de erro
  }
};

connectDB();

app.use('/api/machines', machineRoutes);
app.use('/api/chips', chipRoutes);
app.use('/api/telsystems', telSystemRoutes);
app.use('/api/products', productRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/wol', wolRoutes);

app.get('/', (req, res) => {
  res.send('Inventory API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
