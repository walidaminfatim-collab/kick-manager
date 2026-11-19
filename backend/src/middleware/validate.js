'use strict';
const { HttpError } = require('../utils/errors');

/** validate(schema, 'body' | 'query' | 'params') */
module.exports = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.') || source}: ${i.message}`).join('; ');
    return next(new HttpError(400, msg, 'VALIDATION'));
  }
  if (source === 'query') Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
  else req[source] = result.data;
  next();
};
