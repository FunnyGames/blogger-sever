const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const chatModel = require('../models/chat.model');
const messageModel = require('../models/message.model');
const userModel = require('../models/user.model');
const utils = require('../common/utils');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');


module.exports.createChat = async (userId, username, data) => {
    // Log the function name and the data
    logger.info(`createChat - userId: ${userId}, username: ${username}, data: ${JSON.stringify(data)}`);

    // Set empty response
    let response = {};
    try {
        // Check that user is not opening chat with themselves
        if (userId === data.userId) {
            logger.error('User cannot open a chat with themselves');
            return responseError(400, 'You cannot open a chat with yourself');
        }
        // Check if user exists
        const userData = await userModel.findOne({ _id: data.userId }).select('username');
        if (!userData) {
            logger.error('User not found');
            return responseError(404, 'User not found');
        }
        const userId2 = userData._id;
        // Check if chat exists
        const chat = await chatModel.findOne({
            $or: [
                {
                    userId1: userId,
                    userId2
                },
                {
                    userId1: userId2,
                    userId2: userId
                }
            ]
        });
        if (chat) {
            logger.warn('Chat already exists with id: ' + chat._id);
            response = chat;
        } else {
            const chatData = {
                username1: username,
                userId1: userId,
                username2: userData.username,
                userId2
            };
            response = await chatModel.create(chatData);
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.createMessage = async (userId, username, chatId, data) => {
    // Log the function name and the data
    logger.info(`createMessage - userId: ${userId}, username: ${username}, chatId: ${chatId}, data: ${JSON.stringify(data)}`);

    // Set empty response
    let response = {};
    try {
        // Check if chat exists
        const chat = await chatModel.findOne({ _id: chatId });
        if (!chat) {
            logger.error('Chat not found');
            return responseError(404, 'Chat not found');
        }
        if (chat.userBlocked1 || chat.userBlocked2) {
            logger.error('Cannot post message to a blocked user');
            return responseError(405, 'Cannot post message to a blocked user');
        }
        const { content } = data;
        const message = {
            content,
            fromUserId: userId,
            chatId
        };
        response = await messageModel.create(message);
        const updateChatData = {
            $inc: { totalMessages: 1, totalNewMessages: 1 },
            lastMessage: utils.shortenMessage(content),
            lastUserId: userId,
            lastMessageId: response._id,
            lastUpdate: new Date(),
            deleted: false
        };
        await chatModel.updateOne({ _id: chatId }, updateChatData);
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getMessages = async (userId, chatId, seenIds, limit) => {
    // Log the function name and the data
    logger.info(`getMessages - userId: ${userId}, chatId: ${chatId}, seenIds: ${seenIds} limit: ${limit}`);

    // Set empty response
    let response = {};
    try {
        // Check if chat exists
        const chat = await chatModel.findOne({ _id: chatId, $or: [{ userId1: userId }, { userId2: userId }] });
        if (!chat) {
            logger.error('Chat not found');
            return responseError(404, 'Chat not found');
        }
        if (chat.lastUserId && chat.lastUserId.toString() !== userId && chat.totalNewMessages > 0) {
            await chatModel.updateOne({ _id: chatId }, { $set: { totalNewMessages: 0 } });
        }

        // Match object to aggregate with
        // Search by chatId
        // Remove all seen messages
        let matchObject = {
            chatId: mongoose.Types.ObjectId(chatId)
        };
        if (seenIds) {
            seenIds = seenIds.map(id => mongoose.Types.ObjectId(id));
            matchObject._id = { $nin: seenIds };
        }

        let messages = await messageModel.aggregate([
            {
                $match: matchObject
            },
            {
                $project: {
                    chatId: 0,
                    __v: 0
                }
            },
            {
                $sort: { createDate: -1 }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    messages: [{ $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    messages: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, messages: [...] }]
        // So convert the array to object
        messages = messages[0];

        // Check if metadata is missing (happens if nothing found)
        if (!messages.metadata) {
            messages.metadata = {
                total: 0
            }
        }

        // Set it to response
        response = messages;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getChatList = async (userId) => {
    // Log the function name and the data
    logger.info(`getChatList - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Get chat list
        const chats = await chatModel.find({ $or: [{ userId1: userId }, { userId2: userId }] }).select('-__v -createDate').sort('-lastUpdate');

        // Set it to response
        response = { chats };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getTotalNewMessages = async (userId) => {
    // Log the function name and the data
    logger.info(`getTotalNewMessages - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Count number of new message for user
        const count = await chatModel.countDocuments({
            $or: [{ userId1: userId }, { userId2: userId }],
            lastUserId: { $ne: userId },
            totalNewMessages: { $gt: 0 }
        });

        // Set it to response
        response = { count };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.blockedUsers = async (userId) => {
    // Log the function name and the data
    logger.info(`blockedUsers - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Get blocked users
        const blocked = await chatModel.find({
            $or: [
                { userId1: userId, userBlocked2: true },
                { userId2: userId, userBlocked1: true }
            ]
        }).select('_id username1 userId1 username2 userId2');

        // Set it to response
        response = { blocked };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.blockUser = async (userId, chatId) => {
    // Log the function name and the data
    logger.info(`blockUser - userId: ${userId}, chatId: ${chatId}`);

    // Set empty response
    let response = {};
    try {
        // Check if chat exists
        let chat = await chatModel.findOne({ _id: chatId, $or: [{ userId1: userId }, { userId2: userId }] });
        if (!chat) {
            logger.error('Chat not found');
            return responseError(404, 'Chat not found');
        }
        let updateUser;
        if (chat.userId1.toString() === userId) {
            if (chat.userBlocked1) {
                logger.error('User is blocked');
                return responseError(405, `You're blocked`);
            } else if (chat.userBlocked2) {
                logger.warn('User is already blocked other user');
                return responseSuccess({ ok: 1 });
            } else {
                updateUser = { userBlocked2: true };
            }
        } else {
            if (chat.userBlocked2) {
                logger.error('User is blocked');
                return responseError(405, `You're blocked`);
            } else if (chat.userBlocked1) {
                logger.warn('User is already blocked other user');
                return responseSuccess({ ok: 1 });
            } else {
                updateUser = { userBlocked1: true };
            }
        }
        let res = await chatModel.updateOne({ _id: chatId }, { $set: updateUser });
        // Set ok response
        response = { ok: res.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.unblockUser = async (userId, chatId) => {
    // Log the function name and the data
    logger.info(`unblockUser - userId: ${userId}, chatId: ${chatId}`);

    // Set empty response
    let response = {};
    try {
        // Check if chat exists
        let chat = await chatModel.findOne({ _id: chatId, $or: [{ userId1: userId }, { userId2: userId }] });
        if (!chat) {
            logger.error('Chat not found');
            return responseError(404, 'Chat not found');
        }
        let updateUser;
        if (chat.userId1.toString() === userId) {
            if (chat.userBlocked1) {
                logger.error('User is blocked');
                return responseError(405, `You're blocked`);
            } else if (!chat.userBlocked2) {
                logger.warn('User is already unblocked other user');
                return responseSuccess({ ok: 1 });
            } else {
                updateUser = { userBlocked2: false };
            }
        } else {
            if (chat.userBlocked2) {
                logger.error('User is blocked');
                return responseError(405, `You're blocked`);
            } else if (!chat.userBlocked1) {
                logger.warn('User is already unblocked other user');
                return responseSuccess({ ok: 1 });
            } else {
                updateUser = { userBlocked1: false };
            }
        }
        let res = await chatModel.updateOne({ _id: chatId }, { $set: updateUser });
        // Set ok response
        response = { ok: res.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.deleteMessageById = async (userId, chatId, msgId) => {
    // Log the function name and the data
    logger.info(`deleteMessageById - userId: ${userId}, chatId: ${chatId}, msgId: ${msgId}`);

    // Set empty response
    let response = {};
    try {
        // Delete message
        const deletedMsg = { content: '.', deleted: true };
        let res = await messageModel.updateOne({ fromUserId: userId, chatId, _id: msgId }, { $set: deletedMsg });
        if (res.n === 0) {
            logger.error('Message not found');
            return responseError(404, 'Message not found');
        }
        await chatModel.updateOne({ _id: chatId, lastMessageId: msgId }, { $set: { lastMessage: '.', deleted: true } });
        response = { ok: res.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}
