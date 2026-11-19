'use strict';
const router = require('express').Router();
const c = require('../controllers/kickController');
const v = require('../utils/validators');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { oauthLimiter } = require('../middleware/rateLimit');

router.get('/oauth/start', oauthLimiter, requireAuth, validate(v.oauthStartQuery, 'query'), c.start);
router.get('/oauth/callback', oauthLimiter, c.callback);
module.exports = router;
