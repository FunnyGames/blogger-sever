const logger = require('../common/logger')(__filename);
const { validate } = require('./base.validator');
const Joi = require('@hapi/joi');

const enums = ['web', 'email'];
const jNotificationSettings = Joi.array().items(Joi.string().valid(...enums)).unique();

module.exports.updateSettings = (req, res, next) => {
    logger.debug('updateSettings');
    const schema = Joi.object({
        commentSettings: jNotificationSettings.required(),
        reactSettings: jNotificationSettings.required(),
        groupSettings: jNotificationSettings.required(),
        blogSettings: jNotificationSettings.required(),
        friendSettings: jNotificationSettings.required(),
        customSettings: jNotificationSettings.required(),
    });

    validate(schema, req.body, res, next);
}