const notificationServices = require('../services/notification.service');
const logger = require('../common/logger')(__filename);

// This file is responsible for creating an sending notifications
module.exports.sendNotification = async (data) => {
    logger.info(`sendNotification - data: ${JSON.stringify(data)}`);

    const res = await notificationServices.createNotification(data);
    if (res.status !== 200) return;
    let notification = res.data;
    // TODO - use notification to send user in WS
}