const userServices = require('../services/user.service');
const logger = require('../common/logger')(__filename);
const utils = require('../common/utils');
const { COOKIE_JWT } = require('../common/constants');

module.exports.register = async (req, res, next) => {
    logger.info('register');
    const data = req.body;

    let response = await userServices.register(data);
    if (response.status != 200) {
        res.status(response.status).send(response.data);
    } else {
        let jwt = response.data.jwt;
        res.cookie(COOKIE_JWT, jwt);
        res.send({ jwt });
    }
}

module.exports.login = async (req, res, next) => {
    logger.info('login');
    const username = req.body.username;
    const password = req.body.password;

    let response = await userServices.login(username, password);
    if (response.status != 200) {
        res.status(response.status).send(response.data);
    } else {
        let jwt = response.data.jwt;
        res.cookie(COOKIE_JWT, jwt);
        res.send({ jwt });
    }
}

module.exports.logout = async (req, res, next) => {
    logger.info('logout');

    res.clearCookie(COOKIE_JWT);
    res.send({ ok: 1 });
}

module.exports.getProfile = async (req, res, next) => {
    logger.info('getProfile');
    const userId = req.decoded.uid;

    let response = await userServices.getUserById(userId, true);
    res.status(response.status).send(response.data);
}

module.exports.getUserById = async (req, res, next) => {
    logger.info('getUserById');
    const userId = req.params.id;

    let response = await userServices.getUserById(userId);
    res.status(response.status).send(response.data);
}

module.exports.getUsers = async (req, res, next) => {
    logger.info('getUsers');
    const page = req.query.page;
    const limit = req.query.limit;
    const name = req.query.name;
    const sort = utils.getSort(req.query);

    let response = await userServices.getUsers(name, sort, page, limit);
    res.status(response.status).send(response.data);
}

module.exports.updateProfile = async (req, res, next) => {
    logger.info('updateProfile');
    const userId = req.decoded.uid;
    const data = req.body;

    let response = await userServices.updateProfile(userId, data);
    res.status(response.status).send(response.data);
}

module.exports.updatePassword = async (req, res, next) => {
    logger.info('updatePassword');
    const userId = req.decoded.uid;
    const data = req.body;

    let response = await userServices.updatePassword(userId, data);
    res.status(response.status).send(response.data);
}

module.exports.getUserGroups = async (req, res, next) => {
    logger.info('getUserGroups');
    const userId = req.params.id;
    const page = req.query.page;
    const limit = req.query.limit;
    const name = req.query.name;
    const sort = utils.getSort(req.query);

    let response = await userServices.getUserGroups(userId, name, sort, page, limit);
    res.status(response.status).send(response.data);
}

module.exports.available = async (req, res, next) => {
    logger.info('available');
    const username = req.body.username;
    const email = req.body.email;
    const userId = req.decoded ? req.decoded.uid : undefined;

    let response = await userServices.checkAvailability(username, email, userId);
    res.status(response.status).send(response.data);
}