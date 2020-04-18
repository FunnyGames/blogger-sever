const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const userGroupModel = require('../models/usergroup.model');
const subscriptionModel = require('../models/subscription.model');
const security = require('../security/security');
const _ = require('lodash');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.register = async (data) => {
    // Log the function name and the data
    logger.info('register - username: ' + data.username);

    // Set empty response
    let response = {};
    try {
        // First check if user already exists
        let { username, email } = data;
        let user = await userModel.findOne({ $or: [{ username_lower: username.toLowerCase() }, { email_lower: email.toLowerCase() }] });
        if (user) {
            let details = {};
            if (user.username_lower === username.toLowerCase()) {
                details.username = username;
            } else {
                details.email = email;
            }
            logger.warn('User already exists');
            return responseError(400, 'User already exists', details);
        }

        // Hash the password
        data.password = await security.crypt(data.password);

        // Create the user and save in DB
        data.email_lower = data.email;
        data.username_lower = data.username;
        user = await userModel.create(data);

        // If didn't throw exception then `user` exists
        // Create jwt for user
        let jwtData = {
            uid: user._id
        };
        // We don't put expiration date in token because we let server decide the expiration
        // JWT adds automatically creation date - so it's enough

        let jwt = security.signJwt(jwtData);
        // Response will be: { jwt: "<JWT>" }
        response = { jwt };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.login = async (username, password) => {
    // Log the function name and the data
    logger.info('login - username: ' + username);

    // Set empty response
    let response = {};
    try {
        // First check if user exists
        let user = await userModel.findOne({ username_lower: username.toLowerCase() });
        if (!user) {
            logger.warn('Username or password are invalid');
            return responseError(400, 'Username or password are invalid');
        }

        // Validate password
        const validPassword = await security.validatePassword(password, user.password);
        if (!validPassword) {
            logger.warn('Username or password are invalid');
            return responseError(400, 'Username or password are invalid');
        }

        // Create jwt for user
        let jwtData = {
            uid: user._id
        };

        let jwt = security.signJwt(jwtData);
        // Response will be: { jwt: "<JWT>" }
        response = { jwt };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getUserById = async (userId, withEmail, reqUserId, withSub) => {
    // Log the function name and the data
    logger.info(`getUserById - userId: ${userId}, withEmail: ${withEmail}, reqUserId: ${reqUserId}, withSub: ${withSub}`);

    // Set empty response
    let response = {};
    try {
        // First check if user exists
        let user = await userModel.findOne({ _id: userId }).select('_id firstName lastName username email');
        if (!user) {
            logger.warn('User not found');
            return responseError(404, 'User not found');
        }

        // Set response to { email, firstName, lastName, username }
        let data = ['_id', 'firstName', 'lastName', 'username'];
        if (withEmail) data.push('email');

        response = _.pick(user, data);

        if (withSub && reqUserId && userId !== reqUserId) {
            let sub = await subscriptionModel.findOne({ userId: reqUserId, subToUserId: userId });
            if (sub) {
                response.subscribed = true;
            } else {
                response.subscribed = false;
            }
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getUsers = async (name, sort, page, limit) => {
    // Log the function name and the data
    logger.info(`getUsers - name: ${name}, sort: ${sort}, page: ${page}, limit: ${limit}`);

    // Set default name to empty string
    name = name ? name : '';

    // Set empty response
    let response = {};
    try {
        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Sort
        let { key, order } = sort;
        // This will limit sort by
        switch (key) {
            case 'username':
            case 'createDate':
                break;
            default:
                key = 'createDate';
                order = 1;
                break;
        }

        // Find all users matching the name and sort them by create date
        let users = await userModel.aggregate([
            {
                $match: {
                    username_lower: {
                        $regex: name,
                        $options: 'i'
                    }
                }
            },
            {
                $project: {
                    username: 1,
                    firstName: 1,
                    lastName: 1,
                    createDate: 1
                }
            },
            {
                $sort: { [key]: order }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }, { $addFields: { page } }],
                    users: [{ $skip: skip }, { $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    users: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, users: [...] }]
        // So convert the array to object
        users = users[0];

        // Check if metadata is missing (happens if nothing found)
        if (!users.metadata) {
            users.metadata = {
                total: 0,
                page
            }
        }

        // Set it to response
        response = users;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.updateProfile = async (userId, data) => {
    // Log the function name and the data
    logger.info(`updateProfile - userId: ${userId}, data: ${data}`);

    // Set empty response
    let response = {};
    try {
        // Update the DB
        let res = await userModel.updateOne({ _id: userId }, { $set: data });

        // If updated the res.ok will be 1 - this what the client will get
        // 1 - will indicate success and 0 a failure
        response = { ok: res.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.updatePassword = async (userId, data) => {
    // Log the function name and the data
    logger.info(`updatePassword - userId: ${userId}, data: ${data}`);

    // Set empty response
    let response = {};
    try {
        // First check if user exists
        let user = await userModel.findOne({ _id: userId });
        if (!user) {
            logger.warn('User not found');
            return responseError(404, 'User not found');
        }

        // Check if old password is really user`s current password
        const validPassword = await security.validatePassword(data.oldPassword, user.password);
        if (!validPassword) {
            logger.warn('Old password is invalid');
            return responseError(400, 'Old password is invalid');
        }

        // Hash the password if user updates it
        let password = await security.crypt(data.newPassword);

        // Update the DB
        let res = await userModel.updateOne({ _id: userId }, { $set: { password } });

        // If updated the res.ok will be 1 - this what the client will get
        // 1 - will indicate success and 0 a failure
        response = { ok: res.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getUserGroups = async (userId, name, sort, page, limit) => {
    // Log the function name and the data
    logger.info(`getUserGroups - userId: ${userId}, name: ${name}, sort: ${JSON.stringify(sort)}, page: ${page}, limit: ${limit}`);

    // Set default name to empty string
    name = name ? name : '';

    // Set empty response
    let response = {};
    try {
        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Sort
        let { key, order } = sort;
        // This will limit sort by
        switch (key) {
            case 'name':
                break;
            default:
                key = 'name';
                order = 1;
                break;
        }

        // Find all groups matching the name and sort them by create date
        let groups = await userGroupModel.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: 'groups',
                    localField: 'groupId',
                    foreignField: '_id',
                    as: 'group'
                }
            },
            {
                $project: {
                    _id: { $arrayElemAt: ['$group._id', 0] },
                    name: { $arrayElemAt: ['$group.name', 0] },
                    owner: 1
                }
            },
            {
                $match: {
                    name: { $regex: name, $options: 'ig' }
                }
            },
            {
                $sort: { [key]: order }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }, { $addFields: { page } }],
                    groups: [{ $skip: skip }, { $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    groups: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, groups: [...] }]
        // So convert the array to object
        groups = groups[0];

        // Check if metadata is missing (happens if nothing found)
        if (!groups.metadata) {
            groups.metadata = {
                total: 0,
                page
            }
        }
        // Set it to response
        response = groups;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.checkAvailability = async (username, email, userId) => {
    // Log the function name and the data
    logger.info(`checkAvailability - username: ${username}, email: ${email}, userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // First check if user exists
        let match = {};
        if (username) match.username_lower = username.toLowerCase();
        else match.email_lower = email.toLowerCase();

        let user = await userModel.findOne(match).select('-password');
        if (user) {
            if (user._id.toString() !== userId) {
                let data = {
                };
                if (username && username.toLowerCase() === user.username_lower) data.username = username;
                else data.email = email;
                logger.error('User not available - data: ' + JSON.stringify(data));
                return responseError(400, 'User not available', data);
            } else {
                logger.warn('User the owner of this email');
            }
        }

        // Username and email are available
        response = { ok: 1 };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.subscribe = async (userId, username, subToUserId) => {
    // Log the function name and the data
    logger.info(`subscribe - userId: ${userId}, username: ${username}, subToUserId: ${subToUserId}`);

    // Set empty response
    let response = {};
    try {
        // First check if userId is not subscribing to themselves
        if (userId === subToUserId) {
            logger.error('User tries to subscribe to themselves');
            return responseError(400, 'User tries to subscribe to themselves');
        }

        // Check if user exists
        let subUser = await userModel.findOne({ _id: subToUserId }).select('username');
        if (!subUser) {
            logger.error('Sub-User not exists');
            return responseError(404, `The user you are trying to subscribe doesn't exists`);
        }
        let sub = await subscriptionModel.findOne({ userId, subToUserId });
        if (sub) {
            logger.warn('User already subscribed to this user: ' + subToUserId);
            return responseError(400, 'You already subscribed to this user');
        }

        let subData = {
            userId,
            username,
            subToUserId,
            subToUsername: subUser.username
        };
        await subscriptionModel.create(subData);

        // Subscribed successfully
        response = { ok: 1 };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.unsubscribe = async (userId, subToUserId) => {
    // Log the function name and the data
    logger.info(`unsubscribe - userId: ${userId}, subToUserId: ${subToUserId}`);

    // Set empty response
    let response = {};
    try {
        // We don't care if sub not exists, it won't do anything anyways
        let subData = {
            userId,
            subToUserId
        };
        let r = await subscriptionModel.deleteOne(subData);

        // Unsubscribed successully
        response = { ok: r.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.subscriptions = async (userId, name, sort, page, limit) => {
    // Log the function name and the data
    logger.info(`subscriptions - userId: ${userId}, name: ${name}, sort: ${sort}, page: ${page}, limit: ${limit}`);

    // Set default name to empty string
    name = name ? name : '';

    // Set empty response
    let response = {};
    try {
        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Sort
        let { key, order } = sort;
        // This will limit sort by
        switch (key) {
            case 'username':
            case 'createDate':
                break;
            default:
                key = 'createDate';
                order = 1;
                break;
        }

        // Find all subscriptions matching the name and sort them by create date
        let subs = await subscriptionModel.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $project: {
                    subToUserId: 1,
                    subToUsername: 1
                }
            },
            {
                $match: {
                    subToUsername: { $regex: name, $options: 'ig' }
                }
            },
            {
                $sort: { [key]: order }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }, { $addFields: { page } }],
                    users: [{ $skip: skip }, { $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    users: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, users: [...] }]
        // So convert the array to object
        subs = subs[0];

        // Check if metadata is missing (happens if nothing found)
        if (!subs.metadata) {
            subs.metadata = {
                total: 0,
                page
            }
        }
        // Set it to response
        response = subs;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}