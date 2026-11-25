import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRoutes from './routes/index';
import { errorHandler } from './middleware/error.middleware';
import { initSocket, getIo } from './services/socket';
import db from './db';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const allowedOrigins = FRONTEND_ORIGIN.split(',').map(o => o.trim());

// Match any Vercel preview/production URL for this project
export const vercelPreviewPattern = /^https:\/\/flowops[a-z0-9-]*(-dhruvmalik00000-8384s-projects)?\.vercel\.app$/;

// CORS origin checker — shared between Express and Socket.IO
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (vercelPreviewPattern.test(origin)) return true;
  return false;
}

// Initialize Socket.IO (using shared origin checker)
initSocket(httpServer, isAllowedOrigin);

// ─── Security Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ─── Health Check (top-level) ──────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── API Routes ────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Central Error Handler (must be last) ─────────────────────────
app.use(errorHandler);

// ─── Graceful Shutdown ─────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  httpServer.close(() => console.log('HTTP server closed'));
  try { getIo().close(); } catch {}
  await db.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start Server ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`FlowOps backend running on http://localhost:${PORT}`);
  });
}

export default app;
