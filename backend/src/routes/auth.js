'use strict';
const router = require('express').Router();
const c = require('../controllers/authController');
const v = require('../utils/validators');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { activationLimiter } = require('../middleware/rateLimit');

router.post('/activate', activationLimiter, validate(v.activate), c.activate);
router.get('/me', requireAuth, c.me);
router.patch('/language', requireAuth, validate(v.langBody), c.setLanguage);
module.exports = router;
