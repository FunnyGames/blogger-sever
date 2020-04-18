const userServices = require('../services/user.service');
const logger = require('../common/logger')(__filename);
const { COOKIE_JWT } = require('../common/constants');

module.exports = async (req, res, next) => {
    logger.info('userStatus');
    if (req.decoded) {
        let userId = req.decoded.uid;;
        let response = await userServices.getUserById(userId, true);
        // User not found or some error with user or token (userId null for example)
        if (response.status !== 200) {
            res.clearCookie(COOKIE_JWT); // We delete cookie as it has expired
            res.status(401).send({ error: 'Invalid token.', tokenExpired: true });
            return;
        }
        req.decoded.username = response.data.username;
        req.decoded.email = response.data.email;
    }
    next();
}