import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';

// Create Express app
const app = express();

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Hotel-Id'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.set('trust proxy', 1);

// Database connection
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  isConnected = true;
  console.log('MongoDB connected');
}

// Routes loaded flag
let routesLoaded = false;

async function loadRoutes() {
  if (routesLoaded) return;

  // Dynamic import of compiled server routes
  const { apiRoutes } = await import('../../server/dist/routes/index.js');
  const { errorHandler, notFoundHandler } = await import('../../server/dist/middleware/index.js');

  // Mount at /api/v1 since Vercel routes /api/v1/* to this handler
  app.use('/api/v1', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  routesLoaded = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDB();
    await loadRoutes();

    return new Promise<void>((resolve, reject) => {
      app(req as unknown as Request, res as unknown as Response, (err?: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    console.error('API Handler Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? String(error) : undefined
    });
  }
}
