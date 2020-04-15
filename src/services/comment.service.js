const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const blogServices = require('./blog.service');
const commentModel = require('../models/comment.model');
const userModel = require('../models/user.model');
const actions = require('../actions/notification');
const { notification } = require('../constants/notifications');
const utils = require('../common/utils');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.createComment = async (userId, blogId, data) => {
    // Log the function name and the data
    logger.info(`createComment - userId: ${userId}, blogId: ${blogId}, data: ${JSON.stringify(data)}`);

    // Set empty response
    let response = {};
    try {
        // Fetch blog to see if user has permission
        // This also will check if blog exists
        let blogResponse = await blogServices.getBlogById(blogId, userId, false);
        if (blogResponse.status !== 200) {
            return responseError(blogResponse.status, blogResponse.data.error);
        }

        // Blog exists + user has permission to view blog
        // Fetch username
        let user = await userModel.findOne({ _id: userId }).select('username');

        // Check just in case
        if (!user) {
            logger.error('User not found');
            return responseError(404, 'User not found');
        }

        // We save username as well because it will never change, so we won't need additional query
        data.user = user; // user includes _id and username
        data.blogId = blogId;

        // Save to DB
        response = await commentModel.create(data);

        // Send notification
        sendNotification(response, blogResponse.data);
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getComments = async (userId, blogId, guest, seenIds, limit) => {
    // Log the function name and the data
    logger.info(`getComments - userId: ${userId}, blogId: ${blogId}, guest: ${guest}, seenIds: ${seenIds}, limit: ${limit}`);

    // Set empty response
    let response = {};
    try {
        // Fetch blog to see if user has permission
        // This also will check if blog exists
        let blogResponse = await blogServices.getBlogById(blogId, userId, guest);
        if (blogResponse.status !== 200) {
            return responseError(blogResponse.status, blogResponse.data.error);
        }

        // Match object to aggregate with
        // Search by blogId
        // Remove all seen comments
        let matchObject = {
            blogId: mongoose.Types.ObjectId(blogId)
        };
        if (seenIds) {
            seenIds = seenIds.map(id => mongoose.Types.ObjectId(id));
            matchObject._id = { $nin: seenIds };
        }

        // Add users info with lookup
        // Then sort them
        // Then change names of fields and select some of them
        let comments = await commentModel.aggregate([
            {
                $match: matchObject
            },
            {
                $project: {
                    __v: 0
                }
            },
            {
                $sort: { createDate: -1 }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    comments: [{ $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    comments: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, comments: [...] }]
        // So convert the array to object
        comments = comments[0];

        // Check if metadata is missing (happens if nothing found)
        if (!comments.metadata) {
            comments.metadata = {
                total: 0
            }
        }

        // Set it to response
        response = comments;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.updateCommentById = async (commentId, userId, data) => {
    // Log the function name and the data
    logger.info(`updateCommentById - commentId: ${commentId}, userId: ${userId}, data: ${JSON.stringify(data)}`);

    // Set empty response
    let response = {};
    try {
        // No need to check if user has permission to the blog, as long as the comment already exists
        let comment = await commentModel.findOne({ _id: commentId });
        if (!comment) {
            logger.error('Comment not found');
            return responseError(404, 'Comment not found');
        }

        if (comment.user._id.toString() !== userId) {
            logger.error('User is not allowed to edit this comment');
            return responseError(403, 'User is not allowed to edit this comment');
        }

        // Add last update date
        data.lastUpdate = new Date();

        // Save to DB
        response = await commentModel.updateOne({ _id: commentId }, { '$set': data });
        response = { ok: response.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.deleteCommentById = async (commentId, userId) => {
    // Log the function name and the data
    logger.info(`deleteCommentById - commentId: ${commentId}, userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // No need to check if user has permission to the blog, as long as the comment already exists
        let comment = await commentModel.findOne({ _id: commentId });
        if (!comment) {
            logger.error('Comment not found');
            return responseError(404, 'Comment not found');
        }

        if (comment.user._id.toString() !== userId) {
            logger.error('User is not allowed to delete this comment');
            return responseError(403, 'User is not allowed to delete this comment');
        }

        // Save to DB
        response = await commentModel.deleteOne({ _id: commentId });
        response = { ok: response.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.deleteAllByBlogId = async (blogId) => {
    // Log the function name and the data
    logger.info(`deleteAllByBlogId - blogId: ${blogId}`);

    // Set empty response
    let response = {};
    try {
        // Delete all by blog id
        response = await commentModel.deleteMany({ blogId });
        response = { ok: response.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

function sendNotification(data, blog) {
    logger.info('sendNotification');
    let not = {
        kind: notification.comment,
        fromUsername: data.user.username,
        fromUserId: data.user._id,
        userId: blog.owner,
        details: blog._id,
        content: utils.shortenMessage(data.content)
    };
    actions.sendNotification(not);
}