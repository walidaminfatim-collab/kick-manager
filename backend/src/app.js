'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind a reverse proxy / PaaS TLS terminator

  if (env.isProd) {
    app.use((req, res, next) => {
      if (req.secure || req.get('x-forwarded-proto') === 'https') return next();
      res.status(426).json({ error: 'HTTPS required' });
    });
  }
  app.use(helmet());
  const allowed = new Set(env.corsOrigins);
  app.use(cors({
    // No Origin header (curl, Discord bot, server-to-server) is allowed; browsers must be on the allowlist.
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));
  app.use(globalLimiter);
  app.use(express.json({ limit: '50kb' }));

  app.use('/internal', require('./routes/internal'));
  app.use('/api', require('./routes'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
