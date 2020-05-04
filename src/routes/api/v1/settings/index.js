const express = require('express');
const router = express.Router();

const sValidator = require('../../../../validators/settings.validator');
const controller = require('../../../../controllers/settings.controller');

router.post('/', sValidator.updateSettings, controller.updateSettings);

router.get('/', controller.getSettings);

module.exports = router;