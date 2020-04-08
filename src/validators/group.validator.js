const logger = require('../common/logger')(__filename);
const { validate } = require('./base.validator');
const Joi = require('@hapi/joi');

const jName = Joi.string().min(5).max(120);
const jDescription = Joi.string().min(5).max(120);
const jMembers = Joi.array().items(Joi.objectId())

module.exports.createGroup = (req, res, next) => {
    logger.info('createGroup');
    const schema = Joi.object({
        name: jName.required(),
        description: jDescription.required(),
        members: jMembers
    });

    validate(schema, req.body, res, next);
}

module.exports.updateGroup = (req, res, next) => {
    logger.info('updateGroup');
    // Check if empty body
    if (!req.body) {
        logger.error('Body not provided');
        return res.status(400).send('Body not provided');
    }
    // The keys allows to set what is optional with "with" and "without"
    const schema = Joi.object({
        name: jName,
        description: jDescription,
        members: jMembers
    }).xor('name', 'members')
        .without('name', 'members')
        .without('description', 'members')
        .with('name', 'description');

    validate(schema, req.body, res, next);
}