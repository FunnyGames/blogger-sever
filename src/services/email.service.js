const logger = require('../common/logger')(__filename);
const sgMail = require('@sendgrid/mail');
const config = require('config');

sgMail.setApiKey(config.get('sendGridApi'));

module.exports.sendEmailTemplate = async (to, template_id, dynamic_template_data) => {
    // Log the function name and the data
    logger.info(`sendEmailTemplate - to: ${to}, template_id: ${template_id}, dynamic_template_data: ${dynamic_template_data}`);

    try {
        const msg = {
            from: config.get('emailFrom'),
            template_id,
            personalizations: [
                {
                    to: [{ email: to }],
                    dynamic_template_data
                }
            ]
        };

        return await sgMail.send(msg);
    } catch (e) {
        console.log(e);
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
