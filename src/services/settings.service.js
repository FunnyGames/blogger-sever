const logger = require('../common/logger')(__filename);
const settingModel = require('../models/settings.model');
const userModel = require('../models/user.model');
const utils = require('../common/utils');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.updateSettings = async (userId, data) => {
    // Log the function name and the data
    logger.info(`updateSettings - userId: ${userId}, data: ${JSON.stringify(data)}`);

    // Set empty response
    let response = {};
    try {
        // Find if settings exists
        response = await settingModel.updateOne({ userId }, { $set: data });

        response = { ok: response.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getSettings = async (userId) => {
    // Log the function name and the data
    logger.info(`getSettings - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Find if settings exists
        let settings = await settingModel.findOne({ userId }).select('-__v -userId -_id -createDate');
        if (!settings) {
            // Create new settings for user
            logger.info('Create new settings for user');
            let newUser = {
                userId
            };
            settings = await settingModel.create(newUser);
        }

        // Set it to response
        response = settings;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.createDefaultSettings = async (userId) => {
    // Log the function name and the data
    logger.info(`createDefaultSettings - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Create new settings for user
        let newUser = {
            userId
        };
        response = await settingModel.create(newUser);
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getBulk = async (users) => {
    // Log the function name and the data
    logger.info(`getBulk - users: ${users}`);

    // Set empty response
    let response = {};
    try {
        // Find settings
        response = await settingModel.find({ userId: { $in: users } });
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.unsubscribeEmail = async (email, token, t) => {
    // Log the function name and the data
    logger.info(`unsubscribeEmail - email: ${email}, token: ${token}, t: ${t}`);

    // Set empty response
    let response = {};
    try {
        // First decode the token
        let decoded = utils.decodeUscubscribeEmailToken(token, t);
        if (!decoded) {
            logger.error('Error decoding token');
            return responseError(400, 'Invalid token');
        }
        let decodedEmail = decoded.email.toLowerCase();
        if (decodedEmail !== email.toLowerCase()) {
            logger.error('Email in query is not email in token');
            return responseError(400, 'Invalid token');
        }
        let user = await userModel.findOne({ email_lower: decodedEmail }).select('_id');
        if (!user) {
            logger.error('User not found - email: ' + email);
            return responseError(404, 'User not found');
        }
        // Update settings
        let { setting } = decoded;
        let settings = await settingModel.updateOne({ userId: user._id }, { $pull: { [setting]: 'email' } });
        // Set it to response
        response = { ok: settings.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}