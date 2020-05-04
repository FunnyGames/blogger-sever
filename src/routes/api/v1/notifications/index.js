const express = require('express');
const router = express.Router();

const cValidator = require('../../../../validators/common.validator');
const controller = require('../../../../controllers/notification.controller');

router.get('/', cValidator.pagination, controller.getNotifications);
router.get('/short', controller.getShortNotifications);
router.get('/total', controller.getTotalNotifications);

router.get('/readall', controller.readAll);
router.get('/:id/read', cValidator.paramId, controller.readById);

module.exports = router;