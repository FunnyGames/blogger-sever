const logger = require('../common/logger')(__filename);
const { validate } = require('./base.validator');
const Joi = require('@hapi/joi');

const jUserId = Joi.objectId();
const jContent = Joi.string().min(1).max(1000);


module.exports.createChat = (req, res, next) => {
    logger.debug('createChat');
    const schema = Joi.object({
        userId: jUserId.required()
    });

    validate(schema, req.body, res, next);
}

module.exports.createMessage = (req, res, next) => {
    logger.debug('createMessage');
    const schema = Joi.object({
        content: jContent.required()
    });

    validate(schema, req.body, res, next);
}