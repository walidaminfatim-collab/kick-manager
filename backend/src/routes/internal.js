'use strict';
const router = require('express').Router();
const c = require('../controllers/internalController');
const v = require('../utils/validators');
const validate = require('../middleware/validate');
const botAuth = require('../middleware/botAuth');
const { internalLimiter } = require('../middleware/rateLimit');

router.use(internalLimiter, botAuth);
router.post('/licenses/generate', validate(v.botGenerate), c.generate);
router.post('/licenses/permanent', validate(v.botPermanent), c.permanent);
router.post('/licenses/extend', validate(v.botExtend), c.extend);
router.post('/licenses/revoke', validate(v.botRevoke), c.revoke);
router.get('/licenses/status', validate(v.botStatusQuery, 'query'), c.status);
router.get('/licenses', validate(v.botListQuery, 'query'), c.list);
module.exports = router;
