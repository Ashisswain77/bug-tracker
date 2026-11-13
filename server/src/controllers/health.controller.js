import mongoose from 'mongoose';

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export const getHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bug Tracker API is healthy',
    data: {
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: DB_STATES[mongoose.connection.readyState] ?? 'unknown',
    },
  });
};

