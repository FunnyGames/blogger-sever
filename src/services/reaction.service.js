const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const blogServices = require('./blog.service');
const reactionModel = require('../models/reaction.model');
const userModel = require('../models/user.model');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.createReaction = async (userId, blogId, data) => {
    // Log the function name and the data
    logger.info(`createReaction - userId: ${userId}, blogId: ${blogId}, data: ${JSON.stringify(data)}`);

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

        if (react) {
            // Update existing document
            await reactionModel.updateOne({ _id: react._id }, { '$set': data });
        } else {
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

            // Save new document to DB
            await reactionModel.create(data);
        }
        response = { ok: 1 };
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
                $sort: { createDate: -1 }
            },
            {
                $project: {
                    _id: 0,
                    reactionId: '$_id',
                    userId: '$user._id',
                    username: '$user.username',
                    react: '$react'
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
        let reaction = await reactionModel.deleteOne({ _id: reactionId, 'user._id': userId });
        if (reaction.deletedCount === 0) {
            logger.error('Reaction not found');
            return responseError(404, 'Reaction not found');
        }
        response.ok = 1;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}