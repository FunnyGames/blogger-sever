const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const userGroupModel = require('../models/usergroup.model');
const subscriptionModel = require('../models/subscription.model');
const settingServices = require('../services/settings.service');
const security = require('../security/security');
const _ = require('lodash');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

const users = {};

module.exports.addSocketId = (userId, socketId) => {
    logger.info(`addSocketId - userId: ${userId}, socketId: ${socketId}`);
    users[userId] = socketId;
    return true;
}

module.exports.disconnect = (userId) => {
    logger.info(`disconnect - userId: ${userId}`);
    delete users[userId];
    return true;
}

module.exports.getSocketId = (userId) => {
    logger.info(`getSocketId - userId: ${userId}`);
    return users[userId];
}