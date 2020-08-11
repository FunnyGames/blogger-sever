const config = require('config');
const logger = require('../common/logger')(__filename);
const security = require('../security/security');
const moment = require('moment');
const { COOKIE_JWT, HEADER_AUTH } = require('../common/constants');

module.exports = (req, res, next) => {
    const token = req.headers[HEADER_AUTH] || req.cookies[COOKIE_JWT];
    logger.debug('tokenValidation');
    if (token) {
        try {
            const decoded = security.verifyToken(token);
            if (decoded) {
                // make sure that the token is still valid
                // iat - token creation in unix time
                // expirationPeriod is 30 days in config (30 * 24 * 60 * 60 seconds)
                const period = new Number(config.get('expirationPeriod'));
                if (decoded.iat + period < moment().unix()) {
                    logger.warn('Token has expired');
                    res.clearCookie(COOKIE_JWT); // We delete cookie as it has expired
                    res.status(401).send({ error: 'Token has expired.', tokenExpired: true });
                    // Client should get tokenExpired and logout the user and redirect to login page
                    return;
                }
            }
            req.decoded = decoded;

            // Check if user has confirmed their email, if not, let them be guests
            if (decoded.waitingForEmailConfirmation) {
                if (!security.isConfirmEmailUserUrl(req)) {
                    logger.warn('Waiting for Email Confirmation');
                    res.status(401).send({ error: 'Waiting for Email Confirmation.', emailConfirm: true });
                    return;
                }
            }
            next();
        } catch (err) {
            logger.error('Invalid token');
            res.clearCookie(COOKIE_JWT); // We delete cookie as it has expired
            res.status(400).send({ error: 'Invalid token.', tokenExpired: true })
        }
    } else {
        // If no token provided then check if it's a public link so guest can enter
        if (security.isPublicUrl(req)) {
            next();
            return;
        }
        // If not public link then return error
        logger.error('Token not provided');
        res.status(401).send({ error: 'Token not provided.', tokenExpired: true });
    }
}