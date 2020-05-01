const express = require('express');
const router = express.Router();

const cValidator = require('../../../../validators/common.validator');
const hValidator = require('../../../../validators/chat.validator');
const controller = require('../../../../controllers/chat.controller');

router.post('/', hValidator.createChat, controller.createChat);
router.post('/:chatId', cValidator.paramId, hValidator.createMessage, controller.createMessage);

router.put('/:chatId/get', cValidator.paramId, cValidator.seenIds, cValidator.pagination, controller.getMessages);

router.get('/', controller.getChatList);
router.get('/total', controller.getTotalNewMessages);
router.get('/blocked', controller.blockedUsers);
router.get('/:chatId/block', cValidator.paramId, controller.blockUser);
router.get('/:chatId/unblock', cValidator.paramId, controller.unblockUser);

router.delete('/:chatId/delete/:msgId', cValidator.paramId, controller.deleteMessageById);

module.exports = router;