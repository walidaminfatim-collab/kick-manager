'use strict';
const router = require('express').Router();
const mongoose = require('mongoose');

router.get('/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1, time: new Date().toISOString() }));
router.use('/auth', require('./auth'));
router.use('/kick', require('./kick'));
router.use('/accounts', require('./accounts'));
router.use('/streamers', require('./streamers'));
router.use('/templates', require('./templates'));
router.use('/audit', require('./audit'));
module.exports = router;
