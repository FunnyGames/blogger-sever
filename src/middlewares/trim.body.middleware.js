const logger = require('../common/logger')(__filename);

// Trim all fields of request body
module.exports = function (req, res, next) {
    logger.debug('trim');
    if (req.body) {
        for (let k in req.body) {
            req.body[k] = typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k];
        }
    }
    next();
}