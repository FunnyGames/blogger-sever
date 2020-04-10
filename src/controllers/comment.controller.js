const commentServices = require('../services/comment.service');
const logger = require('../common/logger')(__filename);
const utils = require('../common/utils');

module.exports.createComment = async (req, res, next) => {
    logger.info('createComment');
    const userId = req.decoded.uid;
    const blogId = req.params.blogId;
    const data = req.body;

    let response = await commentServices.createComment(userId, blogId, data);
    res.status(response.status).send(response.data);
}

module.exports.getComments = async (req, res, next) => {
    logger.info('getComments');
    const userId = req.decoded && req.decoded.uid;
    const blogId = req.params.blogId;
    const guest = utils.isGeust(req.decoded);
    const seenIds = req.body.seenIds;
    const limit = req.query.limit;

    let response = await commentServices.getComments(userId, blogId, guest, seenIds, limit);
    res.status(response.status).send(response.data);
}

module.exports.updateCommentById = async (req, res, next) => {
    logger.info('updateCommentById');
    const commentId = req.params.id;
    const userId = req.decoded.uid;
    const data = req.body;

    let response = await commentServices.updateCommentById(commentId, userId, data);
    res.status(response.status).send(response.data);
}

module.exports.deleteCommentById = async (req, res, next) => {
    logger.info('deleteCommentById');
    const commentId = req.params.id;
    const userId = req.decoded.uid;

    let response = await commentServices.deleteCommentById(commentId, userId);
    res.status(response.status).send(response.data);
}