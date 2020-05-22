const notificationServices = require('../services/notification.service');
const setttingServices = require('../services/settings.service');
const { notification: type } = require('../constants/notifications');
const socket = require('../socket/socket');
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
}

module.exports.sendFriendNotification = async (data, member) => {
    logger.debug(`sendFriendNotification - data: ${JSON.stringify(data)}, member: ${member}`);

    const { webMember, emailMember } = await filterMember(data, member);

    if (webMember) {
        const event = socket.FRIEND;
        socket.send(webMember, event, data);
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