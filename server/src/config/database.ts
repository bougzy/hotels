import mongoose from 'mongoose';
import { config } from './index.js';

/**
 * Database connection handler
 *
 * WHY THIS MATTERS FOR REVENUE:
 * - Reliable DB = reliable bookings = no lost revenue
 * - Connection pooling = handles traffic spikes during peak booking hours
 * - Graceful reconnection = system stays up even with network issues (important for Africa)
 */

export const connectDatabase = async (): Promise<void> => {
  try {
    // Mongoose connection options optimized for production
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    console.log(`[Database] Database: ${conn.connection.name}`);

    // Connection event handlers for reliability
    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB reconnected successfully');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[Database] MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
  console.log('[Database] MongoDB connection closed');
};
