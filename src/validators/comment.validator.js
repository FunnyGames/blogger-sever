const logger = require('../common/logger')(__filename);
const { validate } = require('./base.validator');
const Joi = require('@hapi/joi');

const jContent = Joi.string().min(5).max(1000);

module.exports.createComment = (req, res, next) => {
    logger.info('createComment');
    const schema = Joi.object({
        content: jContent.required()
    });

    validate(schema, req.body, res, next);
}

module.exports.updateComment = (req, res, next) => {
    logger.info('updateComment');
    const schema = Joi.object({
        content: jContent.required()
    });

    validate(schema, req.body, res, next);
}