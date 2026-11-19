'use strict';
const router = require('express').Router();
const c = require('../controllers/auditController');
const { requireAuth } = require('../middleware/auth');
router.get('/', requireAuth, c.mine);
module.exports = router;
