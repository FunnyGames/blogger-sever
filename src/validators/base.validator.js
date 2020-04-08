const logger = require('../common/logger')(__filename);

module.exports.validate = (schema, value, res, next) => {
    logger.info('validate');

    let valid = this.validateSchema(schema, value, res);
    if (valid)
        next();
}

module.exports.validateSchema = (schema, value, res) => {
    // Don't log sensitive data
    if (isSensitive(value))
        logger.info(`validateSchema`);
    else
        logger.info(`validateSchema - value: ${JSON.stringify(value)}`);

    const { error } = schema.validate(value);
    if (error) {
        res.status(400).send({ error: error.details[0].message });
        return false;
    }
    return true;
}

function isSensitive(values) {
    for (let k in values) {
        const regex = /password/ig;
        if (regex.test(k)) {
            return true;
        }
    }
    return false;
}