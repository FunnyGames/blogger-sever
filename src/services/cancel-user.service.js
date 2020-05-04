const logger = require('../common/logger')(__filename);
const userModel = require('../models/user.model');
const userGroupModel = require('../models/usergroup.model');
const userBlogModel = require('../models/userblog.model');
const groupModel = require('../models/group.model');
const blogModel = require('../models/blog.model');
const commentModel = require('../models/comment.model');
const reactionModel = require('../models/reaction.model');
const notificationModel = require('../models/notification.model');
const subscriptionModel = require('../models/subscription.model');
const settingModel = require('../models/settings.model');
const security = require('../security/security');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.cancelAccount = async (username, password, userId) => {
    // Log the function name and the data
    logger.info(`cancelAccount - username: ${username}, userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        let error = 'One of the fields is wrong, try again.';
        // First check if user exists
        let match = {
            _id: userId,
            username_lower: username.toLowerCase()
        };

        // Check if cancel user is current logged in user
        let user = await userModel.findOne(match);
        if (!user) {
            logger.error('User not found');
            return responseError(400, error);
        }

        const validPassword = await security.validatePassword(password, user.password);
        if (!validPassword) {
            logger.warn('Password is invalid');
            return responseError(400, error);
        }

        // Everything is valid, let's delete them
        let blogs = await blogModel.find({ owner: userId });
        let groups = await groupModel.find({ owner: userId });
        blogs = blogs.map(b => b._id);
        groups = groups.map(g => g._id);

        // Group related
        let d = await userGroupModel.deleteMany({ userId });
        logger.info('Delete user from all groups - count: ' + d.deletedCount);
        d = await userGroupModel.deleteMany({ groupId: { $in: groups } });
        logger.info('Delete other users from all groups - count: ' + d.deletedCount);
        d = await groupModel.deleteMany({ owner: userId });
        logger.info('Delete all groups of user - count: ' + d.deletedCount);

        // Blog related
        d = await userBlogModel.deleteMany({ userId });
        logger.info('Delete user from all blogs - count: ' + d.deletedCount);
        d = await userBlogModel.deleteMany({ blogId: { $in: blogs } });
        logger.info('Delete other users from all blogs - count: ' + d.deletedCount);
        d = await commentModel.deleteMany({ 'user._id': userId });
        logger.info('Delete all comments of user - count: ' + d.deletedCount);
        d = await commentModel.deleteMany({ blogId: { $in: blogs } });
        logger.info('Delete all comments of user - count: ' + d.deletedCount);
        d = await reactionModel.deleteMany({ 'user._id': userId });
        logger.info('Delete all reactions of user - count: ' + d.deletedCount);
        d = await reactionModel.deleteMany({ blogId: { $in: blogs } });
        logger.info('Delete all reactions of user - count: ' + d.deletedCount);
        d = await blogModel.deleteMany({ owner: userId });
        logger.info('Delete all blogs of user - count: ' + d.deletedCount);

        // Subscriptions
        d = await subscriptionModel.deleteMany({ userId });
        logger.info('Delete all subscriptions of user - count: ' + d.deletedCount);
        d = await subscriptionModel.deleteMany({ subToUserId: userId });
        logger.info('Delete all subscribers of user - count: ' + d.deletedCount);

        // Notifications
        d = await notificationModel.deleteMany({ userId });
        logger.info('Delete all notification of user - count: ' + d.deletedCount);

        // User settings
        d = await settingModel.deleteOne({ userId });
        logger.info('Delete user settings of user - count: ' + d.deletedCount);

        // User
        d = await userModel.deleteOne({ _id: userId });
        logger.info('Delete user - count: ' + d.deletedCount);

        response = { ok: d.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}