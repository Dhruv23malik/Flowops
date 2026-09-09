import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRoutes from './routes/index';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: FRONTEND_ORIGIN,
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
  app.listen(PORT, () => {
    console.log(`FlowOps backend running on http://localhost:${PORT}`);
  });
}

export default app;
