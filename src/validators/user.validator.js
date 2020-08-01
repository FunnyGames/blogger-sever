const logger = require('../common/logger')(__filename);
const { validate } = require('./base.validator');
const Joi = require('@hapi/joi');

const jUsername = Joi.string().alphanum().min(5).max(20);
const jPassword = Joi.string().min(8).max(20);
const jFirstName = Joi.string().min(1).max(50);
const jLastName = Joi.string().min(1).max(50);
const jEmail = Joi.string().min(5).max(120).email({ minDomainSegments: 2 });
const jImage = Joi.string().min(25);

module.exports.register = (req, res, next) => {
    logger.debug('register');
    const schema = Joi.object({
        username: jUsername.required(),
        password: jPassword.required(),
        firstName: jFirstName.required(),
        lastName: jLastName.required(),
        email: jEmail.required()
    });

    validate(schema, req.body, res, next);
}

module.exports.login = (req, res, next) => {
    logger.debug('login');
    const schema = Joi.object({
        username: jUsername.required(),
        password: jPassword.required()
    });

    validate(schema, req.body, res, next);
}

module.exports.updateProfile = (req, res, next) => {
    logger.debug('updateProfile');
    const schema = Joi.object({
        email: jEmail,
        firstName: jFirstName,
        lastName: jLastName
    });

    const result = schema.validate(req.body);
    if (result.error) {
        return res.status(400).send({ error: result.error.details[0].message });
    }
    next();
}

module.exports.updatePassword = (req, res, next) => {
    logger.debug('updatePassword');
    const schema = Joi.object({
        oldPassword: jPassword.required(),
        newPassword: jPassword.required()
    });

    validate(schema, req.body, res, next);
}

module.exports.available = (req, res, next) => {
    logger.debug('available');
    const schema = Joi.object({
        username: jUsername,
        email: jEmail
    }).xor('username', 'email');

    validate(schema, req.body, res, next);
}

module.exports.cancelAccount = (req, res, next) => {
    logger.debug('cancelAccount');
    const schema = Joi.object({
        username: jUsername.required(),
        password: jPassword.required()
    });

    validate(schema, req.body, res, next);
}

module.exports.uploadAvatar = (req, res, next) => {
    logger.debug('uploadAvatar');
    const schema = Joi.object({
        image: jImage.required()
    });

    validate(schema, req.body, res, next);
}