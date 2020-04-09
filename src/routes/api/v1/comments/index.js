const express = require('express');
const router = express.Router();

const cValidator = require('../../../../validators/common.validator');
const bValidator = require('../../../../validators/comment.validator');
const controller = require('../../../../controllers/comment.controller');

router.post('/:blogId', bValidator.createComment, controller.createComment);
router.get('/:blogId', cValidator.pagination, controller.getComments);

router.put('/:id', cValidator.paramId, bValidator.updateComment, controller.updateCommentById);
router.delete('/:id', cValidator.paramId, controller.deleteCommentById);

module.exports = router;