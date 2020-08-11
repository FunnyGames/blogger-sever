const logger = require('../common/logger')(__filename);
const sgMail = require('@sendgrid/mail');
const config = require('config');
const { isArray } = require('lodash');

sgMail.setApiKey(config.get('sendGridApi'));

module.exports.sendEmailTemplate = async (to, template_id, dynamic_template_data) => {
    // Log the function name and the data
    logger.info(`sendEmailTemplate - to: ${JSON.stringify(to)}, template_id: ${template_id}, dynamic_template_data: ${JSON.stringify(dynamic_template_data)}`);

    try {
        if (!isArray(to)) {
            to = [{ email: to }];
        }
        const msg = {
            from: config.get('emailFrom'),
            template_id,
            personalizations: [
                {
                    to,
                    dynamic_template_data
                }
            ]
        };

        return await sgMail.send(msg);
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return e;
    }
}

module.exports.sendResetPassword = async (to, username, uid) => {
    // Log the function name and the data
    logger.info(`sendResetPassword - to: ${to}, username: ${username}, uid: ${uid}`);
    let dynamic_template_data = { username, uid };
    let template_id = 'd-cd96197151dc4083b2423264d1144065';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}

module.exports.sendPrivateMessage = async (to, fromUser, username, chatId) => {
    // Log the function name and the data
    logger.info(`sendPrivateMessage - to: ${to}, fromUser: ${fromUser}, username: ${username}, chatId: ${chatId}`);
    let dynamic_template_data = { username, fromUser, chatId };
    let template_id = 'd-4007fb1700b6455586a80e5095cb9723';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}

module.exports.sendCommentNotification = async (to, fromUser, username, blogName, blogId, comment) => {
    // Log the function name and the data
    logger.info(`sendCommentNotification - to: ${to}, fromUser: ${fromUser}, username: ${username}, blogName: ${blogName}, blogId: ${blogId}, comment: ${comment}`);
    let dynamic_template_data = { username, fromUser, blogName, blogId, comment };
    let template_id = 'd-8d8341b81fed4c8090be278f8c91f3ca';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}

module.exports.sendReactionNotification = async (to, fromUser, username, blogName, blogId) => {
    // Log the function name and the data
    logger.info(`sendReactionNotification - to: ${to}, fromUser: ${fromUser}, username: ${username}, blogName: ${blogName}, blogId: ${blogId}`);
    let dynamic_template_data = { username, fromUser, blogName, blogId };
    let template_id = 'd-6ace51fecafa46d0a72aa0a82104dd8e';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}

module.exports.sendBlogNotification = async (to, fromUser, blogName, blogId) => {
    // Log the function name and the data
    logger.info(`sendBlogNotification - to: ${to}, fromUser: ${fromUser}, blogName: ${blogName}, blogId: ${blogId}`);
    let dynamic_template_data = { fromUser, blogName, blogId };
    let template_id = 'd-c6efaccb14f34869a0203f02da77f690';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}

module.exports.sendGroupNotification = async (to, fromUser, groupName, groupId) => {
    // Log the function name and the data
    logger.info(`sendGroupNotification - to: ${to}, fromUser: ${fromUser}, groupName: ${groupName}, groupId: ${groupId}`);
    let dynamic_template_data = { fromUser, groupName, groupId };
    let template_id = 'd-21c8ba14599446b1bba0b57827b6e895';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}

module.exports.sendFriendRequestNotification = async (to, fromUser, username, userId, accept, decline) => {
    // Log the function name and the data
    logger.info(`sendFriendRequestNotification - to: ${to}, fromUser: ${fromUser}, username: ${username}, userId: ${userId}, accept: ${accept}, decline: ${decline}`);
    let dynamic_template_data = { username, fromUser, accept, decline, userId };
    let template_id = 'd-890018cda6d14e3fb6113db9abdcdbba';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}

module.exports.sendConfirmEmail = async (to, username, link) => {
    // Log the function name and the data
    logger.info(`sendConfirmEmail - to: ${to}, username: ${username}, link: ${link}`);
    let dynamic_template_data = { username, link };
    let template_id = 'd-81b2ab6e192e4e58b129083c8772bb3f';

    return await this.sendEmailTemplate(to, template_id, dynamic_template_data);
}