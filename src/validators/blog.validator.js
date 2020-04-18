const logger = require('../common/logger')(__filename);
const { validate } = require('./base.validator');
const Joi = require('@hapi/joi');

const enums = ['public', 'private'];

const jName = Joi.string().min(5).max(120);
const jEntry = Joi.string().min(5);
const jPermission = Joi.string().valid(...enums);
const jMembers = Joi.array().items(Joi.objectId());
const jGroups = Joi.array().items(Joi.objectId());
const jTags = Joi.array().items(Joi.string());

module.exports.createBlog = (req, res, next) => {
    logger.debug('createBlog');
    const schema = Joi.object({
        name: jName.required(),
        entry: jEntry.required(),
        permission: jPermission.required(),
        members: jMembers,
        groups: jGroups,
        tags: jTags
    });

    validate(schema, req.body, res, next);
}

module.exports.updateBlog = (req, res, next) => {
    logger.debug('updateBlog');
    // Check if empty body
    if (!req.body) {
        logger.error('Body not provided');
        return res.status(400).send('Body not provided');
    }
    const schema = Joi.object({
        name: jName,
        entry: jEntry,
        permission: jPermission,
        members: jMembers,
        groups: jGroups,
        tags: jTags
    });

    validate(schema, req.body, res, next);
}