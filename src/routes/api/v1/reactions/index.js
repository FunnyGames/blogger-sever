const express = require('express');
const router = express.Router();

const cValidator = require('../../../../validators/common.validator');
const rValidator = require('../../../../validators/reaction.validator');
const controller = require('../../../../controllers/reaction.controller');

router.post('/:blogId', cValidator.paramId, rValidator.createReaction, controller.createReaction);
router.get('/:blogId', cValidator.paramId, controller.getTotalReactions);
router.put('/:blogId/users', cValidator.paramId, cValidator.seenIds, cValidator.pagination, rValidator.getUsersReactions, controller.getUsersReactions);

router.delete('/:id', cValidator.paramId, controller.deleteReactionById);

module.exports = router;