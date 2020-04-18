const groupServices = require('../services/group.service');
const utils = require('../common/utils');
const logger = require('../common/logger')(__filename);

module.exports.createGroup = async (req, res, next) => {
    logger.info('createGroup');
    const data = req.body;
    const members = req.body.members;
    const userId = req.decoded.uid;
    const username = req.decoded.username;

    let response = await groupServices.createGroup(userId, username, data, members);
    res.status(response.status).send(response.data);
}

module.exports.getGroups = async (req, res, next) => {
    logger.info('getGroups');
    const page = req.query.page;
    const limit = req.query.limit;
    const name = req.query.name;
    const sort = utils.getSort(req.query);
    let userId = null;
    if (req.query.groups === 'my') {
        userId = req.decoded.uid;
    } else if (req.query.userId) {
        userId = req.query.userId;
    }

    let response = await groupServices.getGroups(userId, name, sort, page, limit);
    res.status(response.status).send(response.data);
}

module.exports.getGroupById = async (req, res, next) => {
    logger.info('getGroupById');
    const groupId = req.params.id;

    let response = await groupServices.getGroupById(groupId);
    res.status(response.status).send(response.data);
}

module.exports.updateGroupById = async (req, res, next) => {
    logger.info('updateGroupById');
    const groupId = req.params.id;
    const userId = req.decoded.uid;
    const data = req.body;
    const members = req.body.members;

    let response = await groupServices.updateGroupById(groupId, userId, data, members);
    res.status(response.status).send(response.data);
}

module.exports.deleteGroupById = async (req, res, next) => {
    logger.info('deleteGroupById');
    const groupId = req.params.id;
    const userId = req.decoded.uid;

    let response = await groupServices.deleteGroupById(groupId, userId);
    res.status(response.status).send(response.data);
}

module.exports.getGroupUsers = async (req, res, next) => {
    logger.info('getGroupUsers');
    const groupId = req.params.id;
    const page = req.query.page;
    const limit = req.query.limit;
    const name = req.query.name;
    const sort = utils.getSort(req.query);

    let response = await groupServices.getGroupUsers(groupId, name, sort, page, limit);
    res.status(response.status).send(response.data);
}

module.exports.addMember = async (req, res, next) => {
    logger.info('addMember');
    const groupId = req.params.id;
    const userId = req.decoded.uid;
    const username = req.decoded.username;
    const newUser = req.params.userId;

    let response = await groupServices.addMember(groupId, userId, username, newUser);
    res.status(response.status).send(response.data);
}

module.exports.removeMember = async (req, res, next) => {
    logger.info('removeMember');
    const groupId = req.params.id;
    const userId = req.decoded.uid;
    const delUser = req.params.userId;

    let response = await groupServices.removeMember(groupId, userId, delUser);
    res.status(response.status).send(response.data);
}