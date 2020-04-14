const reactionServices = require('../services/reaction.service');
const logger = require('../common/logger')(__filename);
const utils = require('../common/utils');

module.exports.createReaction = async (req, res, next) => {
    logger.info('createReaction');
    const userId = req.decoded.uid;
    const blogId = req.params.blogId;
    const data = req.body;

    let response = await reactionServices.createReaction(userId, blogId, data);
    res.status(response.status).send(response.data);
}

module.exports.getTotalReactions = async (req, res, next) => {
    logger.info('getTotalReactions');
    const userId = req.decoded && req.decoded.uid;
    const blogId = req.params.blogId;
    const guest = utils.isGeust(req.decoded);

    let response = await reactionServices.getTotalReactions(userId, blogId, guest);
    res.status(response.status).send(response.data);
}

module.exports.getUsersReactions = async (req, res, next) => {
    logger.info('getUsersReactions');
    const userId = req.decoded.uid;
    const blogId = req.params.blogId;
    const seenIds = req.body.seenIds;
    const filter = req.body.filter;
    const limit = req.query.limit;

    let response = await reactionServices.getUsersReactions(userId, blogId, filter, seenIds, limit);
    res.status(response.status).send(response.data);
}

module.exports.deleteReactionById = async (req, res, next) => {
    logger.info('deleteReactionById');
    const reactionId = req.params.id;
    const userId = req.decoded.uid;

    let response = await reactionServices.deleteReactionById(reactionId, userId);
    res.status(response.status).send(response.data);
}