const notificationServices = require('../services/notification.service');
const utils = require('../common/utils');
const logger = require('../common/logger')(__filename);

module.exports.getNotifications = async (req, res, next) => {
    logger.info('getNotifications');
    const userId = req.decoded.uid;
    const filter = req.query.filter;
    const sort = utils.getSort(req.query);
    const page = req.query.page;
    const limit = req.query.limit;

    let response = await notificationServices.getNotifications(userId, filter, sort, page, limit);
    res.status(response.status).send(response.data);
}

module.exports.getShortNotifications = async (req, res, next) => {
    logger.info('getShortNotifications');
    const userId = req.decoded.uid;
    const filter = undefined;
    const sort = { key: 'createDate', order: -1 };
    const page = 1;
    const limit = 10;

    let response = await notificationServices.getNotifications(userId, filter, sort, page, limit);
    res.status(response.status).send(response.data);
}

module.exports.getTotalNotifications = async (req, res, next) => {
    logger.info('getTotalNotifications');
    const userId = req.decoded.uid;

    let response = await notificationServices.getTotalNotifications(userId);
    res.status(response.status).send(response.data);
}

module.exports.readAll = async (req, res, next) => {
    logger.info('readAll');
    const userId = req.decoded.uid;

    let response = await notificationServices.readAll(userId);
    res.status(response.status).send(response.data);
}

module.exports.readById = async (req, res, next) => {
    logger.info('readById');
    const userId = req.decoded.uid;
    const notificationId = req.params.id;

    let response = await notificationServices.readById(userId, notificationId);
    res.status(response.status).send(response.data);
}