const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024, fieldSize: 5 * 1024 * 1024 } });

const cValidator = require('../../../../validators/common.validator');
const uValidator = require('../../../../validators/user.validator');
const controller = require('../../../../controllers/user.controller');

router.post('/register', uValidator.register, controller.register);
router.post('/login', uValidator.login, controller.login);

router.post('/reset/request', uValidator.resetPasswordRequest, controller.resetPasswordRequest);
router.post('/reset/password/:token', uValidator.resetPassword, controller.resetPassword);

router.put('/update/profile', uValidator.updateProfile, controller.updateProfile);
router.put('/update/password', uValidator.updatePassword, controller.updatePassword);
router.put('/available', uValidator.available, controller.available);
router.put('/cancel', uValidator.cancelAccount, controller.cancelAccount);

router.post('/avatar', upload.single('avatar'), uValidator.uploadAvatar, controller.uploadAvatar);
router.delete('/avatar', controller.deleteAvatar);

router.get('/subscribe/:id', cValidator.paramId, controller.subscribe);
router.get('/unsubscribe/:id', cValidator.paramId, controller.unsubscribe);
router.get('/subscriptions', cValidator.pagination, controller.subscriptions);

router.get('/friends/:id/friend', cValidator.paramId, controller.friend);
router.get('/friends/:id/unfriend', cValidator.paramId, controller.unfriend);
router.get('/friends/:id/accept', cValidator.paramId, controller.friendAccept);
router.get('/friends', cValidator.pagination, controller.friends);
router.get('/friends/requests', cValidator.pagination, controller.requests);
router.get('/friends/total', cValidator.pagination, controller.totalFriendRequests);

router.get('/profile', controller.getProfile);                  // both /profile and /:id are both GET and have the same path '/...', so
router.get('/:id', cValidator.paramId, controller.getUserById); // /:id should be below /profile, otherwise 'profile' would be identifeid as :id
router.get('/', cValidator.pagination, controller.getUsers);

router.get('/:id/groups', cValidator.paramId, cValidator.pagination, controller.getUserGroups);

module.exports = router;