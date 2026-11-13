import env from './config/env.js';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const start = async () => {
  try {
    await connectDB(env.mongodbUri);
  } catch (err) {
    console.error(`[startup] Failed to connect to MongoDB: ${err.message}`);
    console.error('[startup] Check MONGODB_URI in server/.env and your Atlas network access list.');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] Running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
  });

  server.on('error', (err) => {
    console.error(`[server] Failed to start: ${err.message}`);
    process.exit(1);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled rejection:', reason);
  process.exit(1);
});

start();

