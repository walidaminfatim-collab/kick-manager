'use strict';
const router = require('express').Router();
const c = require('../controllers/streamerController');
const v = require('../utils/validators');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', c.list);
router.post('/', validate(v.streamerAdd), c.add);
router.post('/refresh', c.refresh);
router.patch('/:id', validate(v.idParam, 'params'), validate(v.streamerPatch), c.patch);
router.delete('/:id', validate(v.idParam, 'params'), c.remove);
module.exports = router;
