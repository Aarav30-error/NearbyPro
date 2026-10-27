import env from './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';
import { startExpiryCron } from './jobs/expireRequests.js';

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start background cron jobs
  startExpiryCron();

  // Start HTTP server
  app.listen(env.PORT, () => {
    console.log(`[NearbyPro Server] Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`[NearbyPro Server] Health check available at http://localhost:${env.PORT}/api/health`);
  });
};

startServer();
