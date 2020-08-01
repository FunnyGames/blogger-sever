const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const blogServices = require('./blog.service');
const reactionModel = require('../models/reaction.model');
const actions = require('../actions/notification');
const { notification } = require('../constants/notifications');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.createReaction = async (userId, username, blogId, data) => {
    // Log the function name and the data
    logger.info(`createReaction - userId: ${userId}, username: ${username}, blogId: ${blogId}, data: ${JSON.stringify(data)}`);

    // Set empty response
    let response = {};
    try {
        // Fetch blog to see if user has permission
        // This also will check if blog exists
        let blogResponse = await blogServices.getBlogById(blogId, userId, false);
        if (blogResponse.status !== 200) {
            return responseError(blogResponse.status, blogResponse.data.error);
        }

        // Check if user already has reaction
        let react = await reactionModel.findOne({ 'user._id': userId, blogId });
        let create = false;

        if (react) {
            // Update existing document
            await reactionModel.updateOne({ _id: react._id }, { '$set': data });
            react.react = data.react;
        } else {
            create = true;
            // We save username as well because it will never change, so we won't need additional query
            const user = {
                _id: userId,
                username
            };
            data.user = user;
            data.blogId = blogId;

            // Save new document to DB
            react = await reactionModel.create(data);
        }

        // Count total reactions of blog
        let reacts = await reactionModel.aggregate([
            {
                $match: {
                    blogId: mongoose.Types.ObjectId(blogId)
                }
            },
            {
                $group: {
                    _id: '$react',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    react: '$_id',
                    count: 1
                }
            }
        ]);
        response = { reacts, myReaction: { _id: react._id, react: react.react } };

        // Send notification if user is not owner
        if (create && userId !== blogResponse.data.owner._id.toString()) {
            sendNotification(react, blogResponse.data);
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getTotalReactions = async (userId, blogId, guest) => {
    // Log the function name and the data
    logger.info(`getTotalReactions - userId: ${userId}, blogId: ${blogId}, guest: ${guest}`);

    // Set empty response
    let response = {};
    try {
        // Fetch blog to see if user has permission
        // This also will check if blog exists
        let blogResponse = await blogServices.getBlogById(blogId, userId, guest);
        if (blogResponse.status !== 200) {
            return responseError(blogResponse.status, blogResponse.data.error);
        }

        // Count total reactions of blog
        let reacts = await reactionModel.aggregate([
            {
                $match: {
                    blogId: mongoose.Types.ObjectId(blogId)
                }
            },
            {
                $group: {
                    _id: '$react',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    react: '$_id',
                    count: 1
                }
            }
        ]);
        response = { reacts };
        if (!guest) {
            let myReaction = await reactionModel.findOne({ blogId, 'user._id': userId }).select('react');
            if (myReaction) {
                response.myReaction = myReaction;
            }
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getUsersReactions = async (userId, blogId, filter, seenIds, limit) => {
    // Log the function name and the data
    logger.info(`getUsersReactions - userId: ${userId}, blogId: ${blogId}, filter: ${filter}, seenIds: ${seenIds}, limit: ${limit}`);

    // Set empty response
    let response = {};
    try {
        // Fetch blog to see if user has permission
        // This also will check if blog exists
        let blogResponse = await blogServices.getBlogById(blogId, userId, false);
        if (blogResponse.status !== 200) {
            return responseError(blogResponse.status, blogResponse.data.error);
        }

        // Filter by reaction
        let matchObject = {
            blogId: mongoose.Types.ObjectId(blogId)
        };
        if (filter) {
            matchObject.react = filter;
        }
        if (seenIds) {
            seenIds = seenIds.map(id => mongoose.Types.ObjectId(id));
            matchObject._id = { $nin: seenIds };
        }

        let middleware;
        if (filter) {
            middleware = {
                $group: {
                    _id: '$react',
                    users: {
                        $push: {
                            reactionId: '$_id',
                            userId: '$user._id',
                            username: '$user.username'
                        }
                    }
                }
            };
        }

        // Fetch users reactions
        let reactions = await reactionModel.aggregate([
            {
                $match: matchObject
            },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'user._id',
                    as: 'userX'
                }
            },
            {
                $sort: { createDate: -1 }
            },
            {
                $project: {
                    _id: 0,
                    reactionId: '$_id',
                    userId: '$user._id',
                    username: '$user.username',
                    react: '$react',
                    avatar: { $arrayElemAt: ['$userX.avatar', 0] }
                }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    reactions: [{ $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    reactions: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, reactions: [...] }]
        // So convert the array to object
        reactions = reactions[0];

        // Check if metadata is missing (happens if nothing found)
        if (!reactions.metadata) {
            reactions.metadata = {
                total: 0
            }
        }

        // Set it to response
        response = reactions;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.deleteReactionById = async (reactionId, userId) => {
    // Log the function name and the data
    logger.info(`deleteReactionById - reactionId: ${reactionId}, userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        let reaction = await reactionModel.findOneAndDelete({ _id: reactionId, 'user._id': userId });
        if (reaction.deletedCount === 0) {
            logger.error('Reaction not found');
            return responseError(404, 'Reaction not found');
        }
        // Count total reactions of blog
        let reacts = await reactionModel.aggregate([
            {
                $match: {
                    blogId: mongoose.Types.ObjectId(reaction.blogId)
                }
            },
            {
                $group: {
                    _id: '$react',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    react: '$_id',
                    count: 1
                }
            }
        ]);
        response = { reacts };
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
        response = await reactionModel.deleteMany({ blogId });
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
    let n = {
        content: data.react,
        sourceName: blog.name,
        sourceId: blog._id,
        kind: notification.react,
        fromUsername: data.user.username,
        fromUserId: data.user._id,
        userId: blog.owner._id,
    };
    actions.sendNotification(n);
}