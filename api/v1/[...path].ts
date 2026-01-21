import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  try {
    // Try multiple import paths for Vercel compatibility
    let apiRoutes, errorHandler, notFoundHandler;

    try {
      // Path when running in Vercel
      const routesModule = await import(path.join(__dirname, '../../server/dist/routes/index.js'));
      const middlewareModule = await import(path.join(__dirname, '../../server/dist/middleware/index.js'));
      apiRoutes = routesModule.apiRoutes;
      errorHandler = middlewareModule.errorHandler;
      notFoundHandler = middlewareModule.notFoundHandler;
    } catch (e) {
      // Fallback: direct relative import
      const routesModule = await import('../../server/dist/routes/index.js');
      const middlewareModule = await import('../../server/dist/middleware/index.js');
      apiRoutes = routesModule.apiRoutes;
      errorHandler = middlewareModule.errorHandler;
      notFoundHandler = middlewareModule.notFoundHandler;
    }

    // Mount at /api/v1
    app.use('/api/v1', apiRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);

    routesLoaded = true;
  } catch (error) {
    console.error('Failed to load routes:', error);
    throw error;
  }
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
      error: String(error)
    });
  }
}
