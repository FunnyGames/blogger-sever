const blogServices = require('../services/blog.service');
const logger = require('../common/logger')(__filename);
const utils = require('../common/utils');

module.exports.createBlog = async (req, res, next) => {
    logger.info('createBlog');
    const userId = req.decoded.uid;
    const username = req.decoded.username;
    const data = req.body;
    const members = req.body.members;
    const groups = req.body.groups;

    let response = await blogServices.createBlog(userId, username, data, members, groups);
    res.status(response.status).send(response.data);
}

module.exports.getBlogs = async (req, res, next) => {
    logger.info('getBlogs');
    const page = req.query.page;
    const limit = req.query.limit;
    const name = req.query.name;
    const sort = utils.getSort(req.query);
    const userId = req.decoded && req.decoded.uid;
    let userIdToShow = null;
    if (req.query.blogs === 'my') {
        userIdToShow = req.decoded.uid;
    } else if (req.query.userId) {
        userIdToShow = req.query.userId;
    }
    const guest = utils.isGeust(req.decoded);

    let response = await blogServices.getBlogs(userId, userIdToShow, guest, name, sort, page, limit);
    res.status(response.status).send(response.data);
}

module.exports.getBlogById = async (req, res, next) => {
    logger.info('getBlogById');
    const blogId = req.params.id;
    const guest = utils.isGeust(req.decoded);
    const userId = req.decoded ? req.decoded.uid : '';

    let response = await blogServices.getBlogById(blogId, userId, guest);
    res.status(response.status).send(response.data);
}

module.exports.updateBlogById = async (req, res, next) => {
    logger.info('updateBlogById');
    const blogId = req.params.id;
    const userId = req.decoded.uid;
    const data = req.body;
    const members = req.body.members;
    const groups = req.body.groups;

    let response = await blogServices.updateBlogById(blogId, userId, data, members, groups);
    res.status(response.status).send(response.data);
}

module.exports.deleteBlogById = async (req, res, next) => {
    logger.info('deleteBlogById');
    const blogId = req.params.id;
    const userId = req.decoded.uid;

    let response = await blogServices.deleteBlogById(blogId, userId);
    res.status(response.status).send(response.data);
}

module.exports.getBlogUsers = async (req, res, next) => {
    logger.info('getBlogUsers');
    const blogId = req.params.id;
    const userId = req.decoded ? req.decoded.uid : '';
    const page = req.query.page;
    const limit = req.query.limit;
    const name = req.query.name;
    const sort = utils.getSort(req.query);

    let response = await blogServices.getBlogUsers(blogId, userId, name, sort, page, limit);
    res.status(response.status).send(response.data);
}