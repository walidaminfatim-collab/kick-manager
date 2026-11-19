'use strict';
const router = require('express').Router();
const c = require('../controllers/templateController');
const v = require('../utils/validators');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', c.list);
router.post('/', validate(v.templateBody), c.create);
router.put('/:id', validate(v.idParam, 'params'), validate(v.templateBody), c.update);
router.delete('/:id', validate(v.idParam, 'params'), c.remove);
router.post('/:id/prepare', validate(v.idParam, 'params'), validate(v.prepareBody), c.prepare);
module.exports = router;
