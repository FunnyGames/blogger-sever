const userServices = require('../services/user.service');
const logger = require('../common/logger')(__filename);
const { COOKIE_JWT } = require('../common/constants');

module.exports = async (req, res, next) => {
    logger.debug('userStatus');
    if (req.decoded) {
        let userId = req.decoded.uid;
        const data = {
            userId,
            withEmail: true
        };
        let response = await userServices.getUserById(data);
        // User not found or some error with user or token (userId null for example)
        if (response.status !== 200) {
            logger.error('User status is cancelled or not found');
            res.clearCookie(COOKIE_JWT); // We delete cookie as it has expired
            res.status(401).send({ error: 'Invalid token.', tokenExpired: true });
            return;
        }
        req.decoded.username = response.data.username;
        req.decoded.email = response.data.email;
        req.decoded.firstName = response.data.firstName;
        req.decoded.lastName = response.data.lastName;
    }
    next();
}