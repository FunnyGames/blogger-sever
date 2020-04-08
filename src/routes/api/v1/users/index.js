const express = require('express');
const router = express.Router();

const cValidator = require('../../../../validators/common.validator');
const uValidator = require('../../../../validators/user.validator');
const controller = require('../../../../controllers/user.controller');

router.post('/register', uValidator.register, controller.register);
router.post('/login', uValidator.login, controller.login);
router.get('/logout', controller.logout);

router.put('/update/profile', uValidator.updateProfile, controller.updateProfile);
router.put('/update/password', uValidator.updatePassword, controller.updatePassword);
router.put('/available', uValidator.available, controller.available);

router.get('/profile', controller.getProfile);                  // both /profile and /:id are both GET and have the same path '/...', so
router.get('/:id', cValidator.paramId, controller.getUserById); // /:id should be below /profile, otherwise 'profile' would be identifeid as :id
router.get('/', cValidator.pagination, controller.getUsers);

router.get('/:id/groups', cValidator.paramId, cValidator.pagination, controller.getUserGroups);

module.exports = router;