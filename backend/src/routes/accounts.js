'use strict';
const router = require('express').Router();
const c = require('../controllers/accountController');
const v = require('../utils/validators');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', c.list);
router.post('/:id/check', validate(v.idParam, 'params'), c.check);
router.delete('/:id', validate(v.idParam, 'params'), c.remove);
module.exports = router;
