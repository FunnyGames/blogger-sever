const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const notificationModel = require('../models/notification.model');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.getNotifications = async (userId, filter, sort, page, limit) => {
    // Log the function name and the data
    logger.info(`getNotifications - userId: ${userId}, filter: ${filter}, sort: ${JSON.stringify(sort)}, page: ${page}, limit: ${limit}`);

    // Set empty response
    let response = {};
    try {
        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Match object to aggregate with
        // Set it to match with user id and notification kind
        const matchObj = {
            userId: mongoose.Types.ObjectId(userId)
        };
        if (filter) matchObj.kind = filter;

        // Sort
        let { key, order } = sort;
        // This will limit sort by
        switch (key) {
            case 'createDate':
                break;
            default:
                key = 'createDate';
                order = -1;
                break;
        }

        let notifications = await notificationModel.aggregate([
            {
                $match: matchObj
            },
            {
                $sort: { [key]: order }
            },
            {
                $project: {
                    seen: 0,
                    __v: 0
                }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }, { $addFields: { page } }],
                    notifications: [{ $skip: skip }, { $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    notifications: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, notifications: [...] }]
        // So convert the array to object
        notifications = notifications[0];

        // Check if metadata is missing (happens if nothing found)
        if (!notifications.metadata) {
            notifications.metadata = {
                total: 0,
                page
            }
        }

        await updateSeenForUserId(userId);

        // Set it to response
        response = notifications;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

async function updateSeenForUserId(userId) {
    logger.info(`updateSeenForUserId - userId: ${userId}`);
    try {
        await notificationModel.updateMany({ userId, seen: false }, { $set: { seen: true } });
    } catch (err) {
        // Catch error and log it
        logger.error(err.message);
    }
}

module.exports.getTotalNotifications = async (userId) => {
    // Log the function name and the data
    logger.info(`getTotalNotifications - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Count the number of unseen notification
        let count = await notificationModel.countDocuments({ userId, seen: false });
        response = { count };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.readAll = async (userId, kind) => {
    // Log the function name and the data
    logger.info(`readAll - userId: ${userId}, kind: ${kind}`);

    // Set empty response
    let response = {};
    try {
        let conditions = {
            userId,
            seen: true,
            read: false
        };
        if (kind) {
            conditions.kind = kind;
        }
        let update = await notificationModel.updateMany(conditions, { $set: { read: true } });
        response = { ok: update.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.readById = async (userId, notificationId) => {
    // Log the function name and the data
    logger.info(`readById - userId: ${userId}, notificationId: ${notificationId}`);

    // Set empty response
    let response = {};
    try {
        let update = await notificationModel.updateOne({ userId, _id: notificationId }, { $set: { read: true, seen: true } });
        response = { ok: update.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.createNotification = async (data, members) => {
    // Log the function name and the data
    logger.info(`createNotification - data: ${JSON.stringify(data)}, members: ${members}`);

    // Set empty response
    let response = {};
    try {
        const length = members.length;
        const list = [];
        for (let i = 0; i < length; ++i) {
            const userId = members[i];
            const n = {
                ...data,
                userId
            };
            list.push(n);
        }
        response = await notificationModel.insertMany(list);
        if (response && response.insertedIds) {
            logger.info('Number of users notified: ' + response.insertedIds.length);
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}