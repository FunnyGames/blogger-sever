const chatServices = require('../services/chat.service');
const logger = require('../common/logger')(__filename);

module.exports.createChat = async (req, res, next) => {
    logger.info('createChat');
    const userId = req.decoded.uid;
    const username = req.decoded.username;
    const data = req.body;

    let response = await chatServices.createChat(userId, username, data);
    res.status(response.status).send(response.data);
}

module.exports.createMessage = async (req, res, next) => {
    logger.info('createMessage');
    const userId = req.decoded.uid;
    const username = req.decoded.username;
    const chatId = req.params.chatId;
    const data = req.body;

    let response = await chatServices.createMessage(userId, username, chatId, data);
    res.status(response.status).send(response.data);
}

module.exports.getMessages = async (req, res, next) => {
    logger.info('getMessages');
    const userId = req.decoded.uid;
    const chatId = req.params.chatId;
    const seenIds = req.body.seenIds;
    const limit = req.query.limit;

    let response = await chatServices.getMessages(userId, chatId, seenIds, limit);
    res.status(response.status).send(response.data);
}

module.exports.getChatList = async (req, res, next) => {
    logger.info('getChatList');
    const userId = req.decoded.uid;

    let response = await chatServices.getChatList(userId);
    res.status(response.status).send(response.data);
}

module.exports.getTotalNewMessages = async (req, res, next) => {
    logger.info('getTotalNewMessages');
    const userId = req.decoded.uid;

    let response = await chatServices.getTotalNewMessages(userId);
    res.status(response.status).send(response.data);
}

module.exports.blockedUsers = async (req, res, next) => {
    logger.info('blockedUsers');
    const userId = req.decoded.uid;

    let response = await chatServices.blockedUsers(userId);
    res.status(response.status).send(response.data);
}

module.exports.blockUser = async (req, res, next) => {
    logger.info('blockUser');
    const userId = req.decoded.uid;
    const chatId = req.params.chatId;

    let response = await chatServices.blockUser(userId, chatId);
    res.status(response.status).send(response.data);
}

module.exports.unblockUser = async (req, res, next) => {
    logger.info('unblockUser');
    const userId = req.decoded.uid;
    const chatId = req.params.chatId;

    let response = await chatServices.unblockUser(userId, chatId);
    res.status(response.status).send(response.data);
}

module.exports.deleteMessageById = async (req, res, next) => {
    logger.info('deleteMessageById');
    const userId = req.decoded.uid;
    const chatId = req.params.chatId;
    const msgId = req.params.msgId;

    let response = await chatServices.deleteMessageById(userId, chatId, msgId);
    res.status(response.status).send(response.data);
}