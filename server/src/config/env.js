import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, then fallback to current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const missingVars = [];

if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === '') {
  missingVars.push('MONGO_URI');
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  missingVars.push('JWT_SECRET');
} else if (process.env.JWT_SECRET.trim().length < 32) {
  console.error('\n[FATAL ERROR] Environment variable validation failed:');
  console.error(' - JWT_SECRET must be at least 32 characters long for security.\n');
  process.exit(1);
}

if (missingVars.length > 0) {
  console.error('\n[FATAL ERROR] Missing required environment variables:');
  missingVars.forEach((varName) => {
    console.error(` - ${varName} is required but was not defined in the environment or .env file.`);
  });
  console.error('Please configure these variables before starting the server.\n');
  process.exit(1);
}

export const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI.trim(),
  JWT_SECRET: process.env.JWT_SECRET.trim(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ? process.env.JWT_EXPIRES_IN.trim() : '7d',
  CLIENT_URL: process.env.CLIENT_URL ? process.env.CLIENT_URL.trim() : 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ? process.env.NODE_ENV.trim() : 'development',
};

export default env;
