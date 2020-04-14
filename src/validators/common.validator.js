const logger = require('../common/logger')(__filename);
const { validate, validateSchema } = require('./base.validator');
const Joi = require('@hapi/joi');

const jPage = Joi.number().integer().min(1);
const jLimit = Joi.number().integer().min(5).max(100);
const jOid = Joi.objectId();
const jSeenIds = Joi.array().items(Joi.objectId());

// This will check if page and limit are correct
module.exports.pagination = (req, res, next) => {
    logger.info('pagination');
    const schema = Joi.object({
        page: jPage,
        limit: jLimit
    }).unknown(); // This allows for other fields other than page and limit to be sent

    let valid = validateSchema(schema, req.query, res);
    if (valid) {
        // Default values if not sent
        if (!req.query.page) req.query.page = 1;
        if (!req.query.limit) req.query.limit = 10;

        // Change string to number
        req.query.page = parseInt(req.query.page);
        req.query.limit = parseInt(req.query.limit);

        next();
    }
}

// This will check if ids in params are actually valid object id of mongo
module.exports.paramId = (req, res, next) => {
    logger.info('paramId');
    let ids = {
        id: jOid.required()
    };
    // In case there are other ids like uid, gid, bid etc
    for (let p in req.params) {
        ids[p] = jOid.required();
    }
    let schema = Joi.object(ids);

    validate(schema, req.params, res, next);
}

// This will check the seen ids for load more option
module.exports.seenIds = (req, res, next) => {
    logger.info('seenIds');
    const schema = Joi.object({
        seenIds: jSeenIds
    }).unknown(); // This allows for other fields to be sent

    validate(schema, req.body, res, next);
}