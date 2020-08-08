const notificationServices = require('../services/notification.service');
const setttingServices = require('../services/settings.service');
const userServices = require('../services/user.service');
const emailServices = require('../services/email.service');
const { notification: type } = require('../constants/notifications');
const socket = require('../socket/socket');
const utils = require('../common/utils');
const logger = require('../common/logger')(__filename);

// This file is responsible for creating an sending notifications
module.exports.sendNotification = async (data, members) => {
    logger.debug(`sendNotification - data: ${JSON.stringify(data)}, members: ${members}`);

    const { webMembers, emailMembers } = await filterMembers(data, members);

    if (webMembers.length > 0) {
        const res = await notificationServices.createNotification(data, webMembers);
        if (res.status !== 200) return;
        const event = socket.NOTIFICATION;
        const length = webMembers.length;
        for (let i = 0; i < length; ++i) {
            const to = webMembers[i];
            socket.send(to, event, data);
        }
    }
    if (emailMembers.length > 0) {
        await sendEmailNotification(data, emailMembers);
    }
}

module.exports.sendFriendNotification = async (data, member) => {
    logger.debug(`sendFriendNotification - data: ${JSON.stringify(data)}, member: ${member}`);

    const { webMember, emailMember } = await filterMember(data, member);

    if (webMember) {
        const event = socket.FRIEND;
        socket.send(webMember, event, data);
    }
    if (emailMember) {
        await sendEmailNotification(data, [emailMember]);
    }
}

async function sendEmailNotification(data, emailMembers) {
    logger.info(`sendEmailNotification - data: ${JSON.stringify(data)}, emailMembers: ${emailMembers}`);
    let { fromUsername, sourceName, sourceId, userId, accept, decline, content, linkToUserId } = data;
    let to, username;
    if (emailMembers.length === 1 && data.kind !== type.group_add && data.kind !== type.blog_new) {
        let userData = {
            userId,
            withEmail: true,
            reqUserId: null,
            withSub: false,
            withFriend: false
        };
        let singleUser = await userServices.getUserById(userData);
        if (singleUser.status !== 200) {
            logger.error('Error getting user - ' + userId);
            return;
        }
        let u = singleUser.data;
        to = u.email;
        username = u.username;
    } else {
        let multipleUsers = await userServices.bulkUsers(emailMembers);
        if (multipleUsers.status !== 200) {
            logger.error('Error getting users - ' + emailMembers);
            return;
        }
        let users = multipleUsers.data;
        to = [];
        for (let i = 0; i < users.length; ++i) {
            let u = {
                email: users[i].email
            };
            to.push(u);
        }
    }
    switch (data.kind) {
        case type.blog_new:
            await emailServices.sendBlogNotification(to, fromUsername, sourceName, sourceId);
            break;
        case type.comment:
            let comment = utils.shortenMessage(content);
            await emailServices.sendCommentNotification(to, fromUsername, username, sourceName, sourceId, comment);
            break;
        case type.react:
            await emailServices.sendReactionNotification(to, fromUsername, username, sourceName, sourceId);
            break;
        case type.group_add:
            await emailServices.sendGroupNotification(to, fromUsername, sourceName, sourceId);
            break;
        case type.friend_request:
            await emailServices.sendFriendRequestNotification(to, fromUsername, username, linkToUserId, accept, decline);
            break;
    }
}

async function filterMembers(data, members) {
    logger.debug(`filterMembers - data: ${data}, members: ${members}`);
    const webMembers = [];
    const emailMembers = [];

    if (!members) {
        members = [data.userId];
    }

    const { data: settings } = await setttingServices.getBulk(members);

    const { kind } = data;
    let nKind = getKind(kind);

    const length = settings.length;
    for (let i = 0; i < length; ++i) {
        const s = settings[i];
        const arr = s[nKind];
        const userId = s.userId.toString();
        if (arr.includes('web')) {
            webMembers.push(userId);
        }
        if (arr.includes('email')) {
            emailMembers.push(userId)
        }
    }

    return { webMembers, emailMembers };
}

async function filterMember(data, userId) {
    logger.debug(`filterMembers - data: ${data}, userId: ${userId}`);
    let webMember = null;
    let emailMember = null;

    const { data: settings } = await setttingServices.getSettings(userId);

    const { kind } = data;
    let nKind = getKind(kind);

    const arr = settings[nKind];
    if (arr.includes('web')) {
        webMember = userId;
    }
    if (arr.includes('email')) {
        emailMember = userId;
    }

    return { webMember, emailMember };
}

function getKind(kind) {
    let nKind = null;
    switch (kind) {
        case type.blog_new: nKind = 'blogSettings'; break;
        case type.comment: nKind = 'commentSettings'; break;
        case type.react: nKind = 'reactSettings'; break;
        case type.group_add: nKind = 'groupSettings'; break;
        case type.friend_request: nKind = 'friendSettings'; break;
        case type.custom:
        default:
            nKind = 'customSettings';
            break;
    }
    return nKind;
}