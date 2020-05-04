const logger = require('../common/logger')(__filename);
const { validate } = require('./base.validator');
const reactions = require('../constants/reactions');
const Joi = require('@hapi/joi');

const enums = reactions.reactions;

const jReact = Joi.string().valid(...enums);

module.exports.createReaction = (req, res, next) => {
    logger.debug('createReaction');
    const schema = Joi.object({
        react: jReact.required()
    });

    validate(schema, req.body, res, next);
}

module.exports.getUsersReactions = (req, res, next) => {
    logger.debug('getUsersReactions');
    const schema = Joi.object({
        filter: jReact
    }).unknown(); // This allows for other fields to be sent

    validate(schema, req.body, res, next);
}