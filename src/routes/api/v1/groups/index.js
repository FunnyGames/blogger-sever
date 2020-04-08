const express = require('express');
const router = express.Router();

const cValidator = require('../../../../validators/common.validator');
const gValidator = require('../../../../validators/group.validator');
const controller = require('../../../../controllers/group.controller');

router.post('/', gValidator.createGroup, controller.createGroup);
router.get('/', cValidator.pagination, controller.getGroups);

router.get('/:id', cValidator.paramId, controller.getGroupById);
router.put('/:id', cValidator.paramId, gValidator.updateGroup, controller.updateGroupById);
router.delete('/:id', cValidator.paramId, controller.deleteGroupById);

router.get('/:id/users', cValidator.paramId, cValidator.pagination, controller.getGroupUsers);
router.get('/:id/users/:userId', cValidator.paramId, controller.addMember);
router.delete('/:id/users/:userId', cValidator.paramId, controller.removeMember);

module.exports = router;