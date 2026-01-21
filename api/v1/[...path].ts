import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
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
}

// Health check endpoint (defined before dynamic imports)
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test endpoint
app.get('/api/v1/test', (_req, res) => {
  res.json({ message: 'API is working!' });
});

// Routes loaded flag
let routesLoaded = false;
let routeLoadError: Error | null = null;

async function loadRoutes() {
  if (routesLoaded) return;
  if (routeLoadError) throw routeLoadError;

  try {
    // Try importing the routes - use .js extension as server uses ESM
    const routesModule = await import('../../server/src/routes/index.js');
    const middlewareModule = await import('../../server/src/middleware/index.js');

    app.use('/api/v1', routesModule.apiRoutes);
    app.use(middlewareModule.notFoundHandler);
    app.use(middlewareModule.errorHandler);

    routesLoaded = true;
  } catch (error) {
    console.error('Failed to load routes:', error);
    routeLoadError = error as Error;
    // Don't throw - let the basic endpoints work
  }
}

// Fallback error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Catch-all for unmatched routes
app.use('/api/v1/*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    routesLoaded,
    routeLoadError: routeLoadError?.message
  });
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Connect to DB first
    await connectDB();

    // Try to load routes (non-blocking)
    try {
      await loadRoutes();
    } catch (e) {
      console.error('Route loading failed:', e);
    }

    // Handle request with Express
    return new Promise<void>((resolve) => {
      app(req as unknown as Request, res as unknown as Response, () => {
        resolve();
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Server initialization error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
