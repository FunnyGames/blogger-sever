const notificationServices = require('../services/notification.service');
const setttingServices = require('../services/settings.service');
const { notification: type } = require('../constants/notifications');
const logger = require('../common/logger')(__filename);

// This file is responsible for creating an sending notifications
module.exports.sendNotification = async (data, members) => {
    logger.debug(`sendNotification - data: ${JSON.stringify(data)}, members: ${members}`);

    const { webMembers, emailMembers } = await filterMembers(data, members);

    if (webMembers.length > 0) {
        const res = await notificationServices.createNotification(data, webMembers);
        if (res.status !== 200) return;
        let notification = res.data;
        // TODO - use notification to send user in WS
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
    let nKind = null;
    switch (kind) {
        case type.blog_new: nKind = 'blogSettings'; break;
        case type.comment: nKind = 'commentSettings'; break;
        case type.react: nKind = 'reactSettings'; break;
        case type.group_add: nKind = 'groupSettings'; break;
        case type.custom:
        default:
            nKind = 'customSettings';
            break;
    }

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