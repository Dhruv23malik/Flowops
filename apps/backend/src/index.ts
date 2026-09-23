import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRoutes from './routes/index';
import { errorHandler } from './middleware/error.middleware';
import { initSocket } from './services/socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const allowedOrigins = FRONTEND_ORIGIN.split(',').map(o => o.trim());

// Match any Vercel preview/production URL for this project
const vercelPreviewPattern = /^https:\/\/flowops[a-z0-9-]*(-dhruvmalik00000-8384s-projects)?\.vercel\.app$/;

// Initialize Socket.IO
initSocket(httpServer, allowedOrigins);

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-side proxy from Vercel rewrites, mobile apps, curl)
    if (!origin) return callback(null, true);
    // Check explicit allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Check Vercel preview/production URLs
    if (vercelPreviewPattern.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true, // required for HttpOnly cookies
}));
app.use(express.json());
app.use(cookieParser());

// ─── Health Check (top-level) ──────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── API Routes ────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Central Error Handler (must be last) ─────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`FlowOps backend running on http://localhost:${PORT}`);
  });
}

export default app;
