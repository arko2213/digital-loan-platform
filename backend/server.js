import dns from 'dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch {}
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/db.js';
import { seedDefaultUsers } from './config/seedDefaultUsers.js';
import authRoutes from './routes/auth.js';
import loanRoutes from './routes/loans.js';
import toolRoutes from './routes/tools.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import { notFound, errorHandler } from './middleware/errors.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));

const explicitOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (explicitOrigins.includes(origin)) return callback(null, true);

    const isLocalOrLAN = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
    if (isLocalOrLAN) return callback(null, true);

    try {
      const { hostname } = new URL(origin);
      if (
        hostname.endsWith('.onrender.com') ||
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.netlify.app')
      ) {
        return callback(null, true);
      }
    } catch {
      // ignore malformed origins
    }

    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'DigitalLoan API' }));
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api', toolRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend static build in production
const frontendDist = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.resolve(frontendDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) next();
  });
});

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 5000);
connectDatabase()
  .then(async () => {
    await seedDefaultUsers();
    app.listen(port, '0.0.0.0', () => console.log(`DigitalLoan API listening on ${port}`));
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });


