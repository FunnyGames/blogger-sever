const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const userGroupModel = require('../models/usergroup.model');
const subscriptionModel = require('../models/subscription.model');
const friendModel = require('../models/friend.model');
const settingServices = require('../services/settings.service');
const fileUploadServices = require('./file.upload.service');
const security = require('../security/security');
const actions = require('../actions/notification');
const { notification } = require('../constants/notifications');
const _ = require('lodash');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');
const shortid = require('shortid');
const moment = require('moment');
const emailServices = require('./email.service');
const utils = require('../common/utils');

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

        // Generate confirm email token
        let link = shortid();
        data.confirmEmailToken = link;

        // Create the user and save in DB
        data.email_lower = data.email;
        data.username_lower = data.username;
        user = await userModel.create(data);

        // Create default settings
        await settingServices.createDefaultSettings(user._id);

        // If didn't throw exception then `user` exists
        // Create jwt for user
        let jwtData = {
            uid: user._id,
            waitingForEmailConfirmation: true
        };
        // We don't put expiration date in token because we let server decide the expiration
        // JWT adds automatically creation date - so it's enough

        let jwt = security.signJwt(jwtData);
        // Response will be: { jwt: "<JWT>" }
        response = { jwt };

        emailServices.sendConfirmEmail(user.email, user.username, link);
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
        if (!user.emailConfirmed) {
            jwtData.waitingForEmailConfirmation = true;
        }

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

module.exports.resendEmailConfirm = async (uid, username, email) => {
    // Log the function name and the data
    logger.info(`resendEmailConfirm - uid: ${uid}, username: ${username}, email: ${email}`);

    // Set empty response
    let response = { ok: 1 };
    try {
        let link = shortid();
        await userModel.updateOne({ _id: uid }, { $set: { confirmEmailToken: link } });
        let res = await emailServices.sendConfirmEmail(email, username, link);
        if (res.error) {
            return responseError(500, res.error);
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.confirmEmail = async (uid, token) => {
    // Log the function name and the data
    logger.info('confirmEmail - uid: ' + uid + ', token: ' + token);

    // Set empty response
    let response = {};
    try {
        let user = await userModel.findOne({ _id: uid }).select('confirmEmailToken');
        if (!user) {
            logger.error('User not found');
            return responseError(404, 'User not found');
        }
        if (user.confirmEmailToken !== token) {
            logger.warn('Invalid token - ' + token + ' - expected: ' + user.confirmEmailToken);
            return responseError(400, 'Invalid token');
        }
        await userModel.updateOne({ _id: uid }, { $unset: { confirmEmailToken: '' }, $set: { emailConfirmed: true } });
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

module.exports.resetPasswordRequest = async (email) => {
    logger.info(`resetPasswordRequest - email: ${email}`);
    const ok = { ok: 1 };
    try {
        const email_lower = email.toLowerCase();
        const user = await userModel.findOne({ email_lower });
        if (!user) {
            logger.error('User not found with email: ' + email_lower);
            return responseSuccess(ok);
        }
        const username = user.username;
        const userId = user._id;
        const key = shortid();
        const expire = moment().add(1, 'day').toDate();
        const uid = utils.encodeToken(key, email_lower, expire);

        const result = await emailServices.sendResetPassword(email_lower, username, uid);
        if (result && result.error) {
            logger.error('Error sending email');
            return responseError(500, SERVER_ERROR);
        }
        await userModel.updateOne({ _id: userId }, { $set: { resetPassword: uid } });
    } catch (error) {
        logger.error(error.message);
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(ok);
}

module.exports.resetPassword = async (token, newPassword) => {
    logger.info(`resetPassword - token: ${token}`);
    const ok = { ok: 1 };
    try {
        const { key, email } = utils.decodeToken(token);

        const email_lower = email.toLowerCase();
        const user = await userModel.findOne({ email_lower });
        if (!user) {
            logger.error('User not found with email: ' + email_lower);
            return responseError(404, 'User not found');
        }
        const userId = user._id;
        const uid = user.resetPassword;
        if (!uid) {
            logger.error('User did not reset password');
            return responseError(402, 'Token not exists');
        }
        const dbToken = utils.decodeToken(uid);
        const expire = dbToken.expire;
        const expireTime = new Date(expire).getTime();
        const now = new Date().getTime();
        if (expireTime < now) {
            logger.error('Token is expired');
            return responseError(402, 'Token is expired');
        }
        const userKey = dbToken.key;
        if (key !== userKey || token !== uid) {
            logger.error('Bad key: ' + key + ', expected: ' + userKey);
            return responseError(402, 'Invalid key');
        }

        // Hash the password
        const password = await security.crypt(newPassword);

        await userModel.updateOne({ _id: userId }, { $set: { password }, $unset: { resetPassword: '' } });
    } catch (error) {
        logger.error(error.message);
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(ok);
}

module.exports.getUserById = async (data) => {
    let { userId, withEmail, reqUserId, withSub, withFriend } = data;
    // Log the function name and the data
    logger.info(`getUserById - userId: ${userId}, withEmail: ${withEmail}, reqUserId: ${reqUserId}, withSub: ${withSub}, withFriend: ${withFriend}`);

    // Set empty response
    let response = {};
    try {
        // First check if user exists
        let user = await userModel.findOne({ _id: userId }).select('_id firstName lastName username email avatar');
        if (!user) {
            logger.warn('User not found');
            return responseError(404, 'User not found');
        }

        // Set response to { email, firstName, lastName, username }
        let data = ['_id', 'firstName', 'lastName', 'username', 'avatar'];
        if (withEmail) data.push('email');

        response = _.pick(user, data);

        if (reqUserId && userId !== reqUserId) {
            if (withSub) {
                let sub = await subscriptionModel.findOne({ userId: reqUserId, subToUserId: userId });
                if (sub) {
                    response.subscribed = true;
                } else {
                    response.subscribed = false;
                }
            }
            if (withFriend) {
                let friend = await friendModel.findOne({
                    $or: [{ userId1: reqUserId, userId2: userId }, { userId1: userId, userId2: reqUserId }]
                }).select('-createDate -__v');
                if (friend) {
                    response.friend = friend;
                } else {
                    response.friend = null;
                }
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
                    avatar: 1,
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

module.exports.bulkUsers = async (userIds) => {
    // Log the function name and the data
    logger.info(`bulkUsers - userIds: ${userIds}`);

    // Set empty response
    let response = {};
    try {
        // Find all users but don't return sensitive information
        response = await userModel.find({ _id: { $in: userIds } }).select('firstName lastName email');
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
        // Check if email is changed
        let user = await userModel.findOne({ _id: userId }).select('username email email_lower emailConfirmed');
        if (!user) {
            logger.error('User not found');
            return responseError(404, 'User not found');
        }
        if (data.email) {
            data.email_lower = data.email.toLowerCase();
            if (user.email_lower !== data.email_lower) {
                let e = await userModel.findOne({ email_lower: data.email_lower }).select('username');
                if (e && e._id.toString() !== user._id.toString()) {
                    logger.error('Email already takeb by user: ' + e.username);
                    return responseError(400, 'Email already taken');
                } else if (!user.emailConfirmed) {
                    logger.info('Sending verification to new email: ' + data.email);
                    await this.resendEmailConfirm(user._id, user.username, data.email);
                }
            }
        }

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

module.exports.subscriptions = async (userId, name, sort, page, limit, subToMe) => {
    // Log the function name and the data
    logger.info(`subscriptions - userId: ${userId}, name: ${name}, sort: ${sort}, page: ${page}, limit: ${limit}, subToMe: ${subToMe}`);

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
                key = 'subToUsername';
            case 'createDate':
                break;
            default:
                key = 'createDate';
                order = 1;
                break;
        }

        // subToMe = true - My subscribers
        // else - Who I'm subsribed to
        let match = {};
        if (subToMe) {
            match.subToUserId = mongoose.Types.ObjectId(userId);
        } else {
            match.userId = mongoose.Types.ObjectId(userId);
        }

        // Find all subscriptions matching the name and sort them by create date
        let subs = await subscriptionModel.aggregate([
            {
                $match: match
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'subToUserId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    avatar: { $arrayElemAt: ['$user.avatar', 0] },
                    subToUserId: 1,
                    subToUsername: 1,
                    createDate: 1
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

module.exports.friend = async (userId, username, toUserId) => {
    // Log the function name and the data
    logger.info(`friend - userId: ${userId}, username: ${username}, toUserId: ${toUserId}`);

    // Set empty response
    let response = {};
    try {
        // First check if userId is not sending request to themselves
        if (userId === toUserId) {
            logger.error('User tries to friends themselves');
            return responseError(400, 'User tries to friends themselves');
        }

        // Check if user exists
        let secUser = await userModel.findOne({ _id: toUserId }).select('username');
        if (!secUser) {
            logger.error('User not exists');
            return responseError(404, `The user you are trying to friend doesn't exists`);
        }
        let friend = await friendModel.findOne(
            {
                $or: [
                    { userId1: userId, userId2: toUserId },
                    { userId1: toUserId, userId2: userId }
                ]
            }
        );
        if (friend) {
            const { pending } = friend;
            if (pending) {
                logger.warn('User already send friend request to this user: ' + toUserId);
                return responseError(400, 'You already sent friend request to this user');
            }
            logger.warn('User already friend to this user: ' + toUserId);
            return responseError(400, 'You already friend with this user');
        }

        let friendData = {
            userId1: userId,
            userRequested: userId,
            username1: username,
            userId2: toUserId,
            username2: secUser.username
        };

        // Request sent successfully
        response = await friendModel.create(friendData);

        sendFriendNotification(userId, response.toObject());
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.unfriend = async (userId, friendId) => {
    // Log the function name and the data
    logger.info(`unfriend - userId: ${userId}, friendId: ${friendId}`);

    // Set empty response
    let response = {};
    try {
        // We don't care if request not exists, it won't do anything anyways
        let friendData = {
            _id: friendId,
            $or: [
                { userId1: userId },
                { userId2: userId }
            ]
        };
        let r = await friendModel.deleteOne(friendData);

        // Friend removed successully
        response = { ok: r.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.friendAccept = async (userId, friendId) => {
    // Log the function name and the data
    logger.info(`friendAccept - userId: ${userId}, friendId: ${friendId}`);

    // Set empty response
    let response = {};
    try {
        // We don't care if sub not exists, it won't do anything anyways
        let friendData = {
            _id: friendId,
            $or: [
                { userId1: userId },
                { userId2: userId }
            ]
        };
        let friend = await friendModel.findOne(friendData);
        if (!friend) {
            logger.error('Friend request not found');
            return responseError(404, 'Friend request not found');
        }
        if (!friend.pending) {
            logger.error('Friend request already accepted');
            return responseError(404, 'Friend request already accepted');
        }
        let r = await friendModel.updateOne({ _id: friendId }, { pending: false });

        // Friend removed successully
        response = { ok: r.ok };

        sendFriendNotification(userId, { ...friend.toObject(), pending: false });
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.friends = async (userId, name, sort, filter, page, limit, filterData, hideRequests) => {
    // Log the function name and the data
    logger.info(`friends - userId: ${userId}, name: ${name}, sort: ${sort}, filter: ${filter}, page: ${page}, limit: ${limit}, filterData: ${filterData}, hideRequests: ${hideRequests}`);

    // Set default name to empty string
    name = name || '';

    // Set empty response
    let response = {};
    try {
        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Sort
        let { key, order } = sort;
        // This will limit sort by
        switch (key) {
            case 'createDate':
                break;
            default:
                key = 'createDate';
                order = 1;
                break;
        }
        // Check filter
        const uId = mongoose.Types.ObjectId(userId);
        const matchObj = {
            pending: false,
            $or: [
                {
                    userId1: uId,
                },
                {
                    userId2: uId
                }
            ]
        };
        const projectObj = {
            createDate: 0,
            __v: 0
        };
        if (!filterData) {
            if (filter === true || filter === false) {
                matchObj.pending = filter;
                // Only show friend requests that user NOT requested
                if (filter && hideRequests) {
                    matchObj.userRequested = { $ne: uId };
                }
            }
        } else {
            projectObj._id = 0;
            projectObj.pending = 0;
            projectObj.userRequested = 0;
        }
        // Find all friends matching the name and sort them by create date
        let friends = await friendModel.aggregate([
            {
                $match: matchObj
            },
            {
                $match: {
                    $or: [
                        { username1: { $regex: name, $options: 'ig' } },
                        { username2: { $regex: name, $options: 'ig' } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId1',
                    foreignField: '_id',
                    as: 'user1'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId2',
                    foreignField: '_id',
                    as: 'user2'
                }
            },
            {
                $sort: { [key]: order }
            },
            {
                $project: {
                    pending: 1,
                    userRequested: 1,
                    userId1: 1,
                    username1: 1,
                    avatar1: { $arrayElemAt: ['$user1.avatar', 0] },
                    userId2: 1,
                    username2: 1,
                    avatar2: { $arrayElemAt: ['$user2.avatar', 0] }
                }
            },
            {
                $project: projectObj
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
        friends = friends[0];

        // Check if metadata is missing (happens if nothing found)
        if (!friends.metadata) {
            friends.metadata = {
                total: 0,
                page
            }
        }
        // Set it to response
        response = friends;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.totalFriendRequests = async (userId) => {
    // Log the function name and the data
    logger.info(`totalFriendRequests - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Count the number of friend requests
        let friendData = {
            pending: true,
            $or: [
                { userId1: userId },
                { userId2: userId }
            ],
            userRequested: { $ne: userId }
        };
        const requests = await friendModel.find(friendData).select('_id');
        const count = requests.map(r => r._id);
        response = { count };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

function sendFriendNotification(userId, data) {
    logger.info('sendFriendNotification - userId: ' + userId + ', data: ' + JSON.stringify(data));

    const userId1 = data.userId1.toString();
    const userId2 = data.userId2.toString();
    const toUserId = userId === userId1 ? userId2 : userId1;
    const fromUsername = userId === userId1 ? data.username1 : data.username2;
    const fromUserId = userId === userId1 ? userId1 : userId2;
    const accept = new Buffer(`${data._id};accept`).toString('base64').replace(/=/g, '-');
    const decline = new Buffer(`${data._id};decline`).toString('base64').replace(/=/g, '-');

    let n = {
        linkToUserId: fromUserId,
        userId: toUserId,
        accept,
        decline,
        content: data,
        kind: notification.friend_request,
        fromUsername,
        fromUserId
    };
    actions.sendFriendNotification(n, toUserId);
}

module.exports.uploadAvatar = async (userId, image) => {
    // Log the function name and the data
    logger.info(`uploadAvatar - userId: ${userId}, image.length: ${image.length}`);

    // Set empty response
    let response = {};
    try {
        let user = await userModel.findOne({ _id: userId }).select('avatarId');
        if (user && user.avatarId) {
            logger.info('Deleting old image - avatarId: ' + user.avatarId);
            await fileUploadServices.deleteImage(user.avatarId);
        }
        let result = await fileUploadServices.uploadImage(userId, image);
        if (!result) {
            logger.error('Error uploading avatar');
            return responseError(400, 'Error uploading avatar');
        }
        await userModel.updateOne({ _id: userId }, { $set: { avatar: result.url, avatarId: result.public_id } });
        response.avatar = result.url;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.deleteAvatar = async (userId) => {
    // Log the function name and the data
    logger.info(`deleteAvatar - userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        let user = await userModel.findOne({ _id: userId }).select('avatarId');
        if (!user || !user.avatarId) {
            logger.error('User has no avatar');
            return responseSuccess({ ok: 1 });
        }
        let result = await fileUploadServices.deleteImage(user.avatarId);
        if (!result) {
            logger.error('Error deleting avatar');
            return responseError(400, 'Error deleting avatar');
        }

        let update = await userModel.updateOne({ _id: userId }, { $set: { avatar: '', avatarId: '' } });
        response = { ok: update.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}