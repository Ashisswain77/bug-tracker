import mongoose from 'mongoose';

/**
 * Connects to MongoDB (Atlas or local) using Mongoose.
 * Throws on failure so the caller can abort startup.
 */
export const connectDB = async (uri) => {
  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  // Runtime connection events (registered after the initial connect succeeds)
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected');
  });
  mongoose.connection.on('error', (err) => {
    console.error(`[db] MongoDB error: ${err.message}`);
  });

  console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('[db] MongoDB connection closed');
};
