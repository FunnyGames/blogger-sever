const logger = require('../common/logger')(__filename);
const userValidator = require('./user.validator');
const { validate } = require('./base.validator');
const Joi = require('@hapi/joi');

const enums = ['web', 'email'];
const jNotificationSettings = Joi.array().items(Joi.string().valid(...enums)).unique();
const jEmailSettings = Joi.array().items(Joi.string().valid('email')).unique();
const jEmail = userValidator.jEmail;
const jTime = Joi.number().min(1);
const jToken = Joi.string().min(1);

module.exports.updateSettings = (req, res, next) => {
    logger.debug('updateSettings');
    const schema = Joi.object({
        commentSettings: jNotificationSettings.required(),
        reactSettings: jNotificationSettings.required(),
        groupSettings: jNotificationSettings.required(),
        blogSettings: jNotificationSettings.required(),
        friendSettings: jNotificationSettings.required(),
        messageSettings: jEmailSettings.required(),
        customSettings: jNotificationSettings.required(),
    });

    validate(schema, req.body, res, next);
}

module.exports.unsubscribeEmail = (req, res, next) => {
    logger.debug('unsubscribeEmail');
    const schema = Joi.object({
        email: jEmail.required(),
        token: jToken.required(),
        t: jTime.required(),
    });

    validate(schema, req.query, res, next);
}