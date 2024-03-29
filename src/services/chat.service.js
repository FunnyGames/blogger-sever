const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const chatModel = require('../models/chat.model');
const messageModel = require('../models/message.model');
const userModel = require('../models/user.model');
const emailServices = require('./email.service');
const settingsServices = require('./settings.service');
const utils = require('../common/utils');
const socket = require('../socket/socket');
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
        let message = {
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

        message = response.toObject();
        const meUser1 = chat.userId1.toString() === userId;
        const otherUser = meUser1 ? chat.userId2 : chat.userId1;
        message.fromUsername = meUser1 ? chat.username1 : chat.username2;
        let sent = socket.send(otherUser, socket.MESSAGE, message);
        if (!sent) {
            let toUsername = meUser1 ? chat.username2 : chat.username1;
            sendPrivateMessageByEmail(message.fromUsername, toUsername, otherUser, chatId);
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

const sendPrivateMessageByEmail = async (fromUsername, toUsername, toUserId, chatId) => {
    logger.info(`sendPrivateMessageByEmail - fromUsername: ${fromUsername}, toUsername: ${toUsername}, toUserId: ${toUserId}, chatId: ${chatId}`);
    let userTo = await userModel.findOne({ _id: toUserId }).select('email');
    if (userTo) {
        let to = userTo.email;
        let settings = await settingsServices.getSettings(toUserId);
        if (settings.status !== 200) {
            logger.error('Error getting settings for user: ' + toUsername);
            return;
        }
        let emailSettings = settings.data.messageSettings;
        if (emailSettings.includes('email')) {
            await emailServices.sendPrivateMessage(to, fromUsername, toUsername, chatId);
            logger.info('Email sent successfully to: ' + to);
        } else {
            logger.info(`User ${toUsername} disabled email for private messages`);
        }
    }
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
        const userArray = [];
        for (let i = 0; i < chats.length; ++i) {
            let c = chats[i];
            const uid = c.userId1.toString() === userId ? c.userId2.toString() : c.userId1.toString();
            userArray.push(uid);
        }
        const avatarList = await userModel.find({ _id: { $in: userArray } }).select('avatar');
        const avatars = {};
        for (let i = 0; i < avatarList.length; ++i) {
            let a = avatarList[i];
            avatars[a._id] = a.avatar;
        }

        // Set it to response
        response = { chats, avatars };
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
        const chats = await chatModel.find({
            $or: [{ userId1: userId }, { userId2: userId }],
            lastUserId: { $ne: userId },
            totalNewMessages: { $gt: 0 }
        }).select('_id');
        const count = chats.map(c => c._id);

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
        }).select('_id username1 userId1 username2 userId2').populate('userId1 userId2', 'avatar');

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
        let otherUser;
        if (chat.userId1.toString() === userId) {
            if (chat.userBlocked1) {
                logger.error('User is blocked');
                return responseError(405, `You're blocked`);
            } else if (chat.userBlocked2) {
                logger.warn('User is already blocked other user');
                return responseSuccess({ ok: 1 });
            } else {
                updateUser = { userBlocked2: true };
                otherUser = chat.userId2;
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
                otherUser = chat.userId1;
            }
        }
        let res = await chatModel.updateOne({ _id: chatId }, { $set: updateUser });
        // Set ok response
        response = { ok: res.ok };

        let data = { chatId };
        socket.send(otherUser, socket.BLOCK_USER, data);
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
        let otherUser;
        if (chat.userId1.toString() === userId) {
            if (chat.userBlocked1) {
                logger.error('User is blocked');
                return responseError(405, `You're blocked`);
            } else if (!chat.userBlocked2) {
                logger.warn('User is already unblocked other user');
                return responseSuccess({ ok: 1 });
            } else {
                updateUser = { userBlocked2: false };
                otherUser = chat.userId2;
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
                otherUser = chat.userId1;
            }
        }
        let res = await chatModel.updateOne({ _id: chatId }, { $set: updateUser });
        // Set ok response
        response = { ok: res.ok };

        let data = { chatId };
        socket.send(otherUser, socket.UNBLOCK_USER, data);
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

        let chat = await chatModel.findOne({ _id: chatId });
        if (chat) {
            let otherUser = chat.userId1.toString() === userId ? chat.userId2 : chat.userId1;
            let data = { chatId, msgId };
            socket.send(otherUser, socket.DELETE_MESSAGE, data);
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.markMessageReadById = async (userId, chatId, msgId) => {
    // Log the function name and the data
    logger.info(`markMessageReadById - userId: ${userId}, chatId: ${chatId}, msgId: ${msgId}`);

    // Set empty response
    let response = {};
    try {
        // Mark message read
        response = await chatModel.updateOne({ _id: chatId, lastMessageId: msgId, $or: [{ userId1: userId }, { userId2: userId }] }, { totalNewMessages: 0 });
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}
