'use strict';
const { HttpError } = require('../utils/errors');

function notFound(_req, _res, next) { next(new HttpError(404, 'Not found', 'NOT_FOUND')); }

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: err.code });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON', code: 'BAD_JSON' });
  console.error('[error]', req.method, req.originalUrl, err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}
module.exports = { notFound, errorHandler };
