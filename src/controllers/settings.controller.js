const settingServices = require('../services/settings.service');
const logger = require('../common/logger')(__filename);

module.exports.updateSettings = async (req, res, next) => {
    logger.info('updateSettings');
    const userId = req.decoded.uid;
    const data = req.body;

    let response = await settingServices.updateSettings(userId, data);
    res.status(response.status).send(response.data);
}

module.exports.getSettings = async (req, res, next) => {
    logger.info('getSettings');
    const userId = req.decoded.uid;

    let response = await settingServices.getSettings(userId);
    res.status(response.status).send(response.data);
}

module.exports.unsubscribeEmail = async (req, res, next) => {
    logger.info('unsubscribeEmail');
    const { email, token, t } = req.query;

    let response = await settingServices.unsubscribeEmail(email, token, t);
    res.status(response.status).send(response.data);
}