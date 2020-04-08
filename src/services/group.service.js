const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const groupModel = require('../models/group.model');
const userGroupModel = require('../models/usergroup.model');
const utils = require('../common/utils');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.createGroup = async (userId, data, members) => {
    // Log the function name and the data
    logger.info(`createGroup - userId: ${userId}, data: ${JSON.stringify(data)}, members: ${members}`);

    // Set empty response
    let response = {};
    try {
        // Set owner to userId
        data.owner = userId;

        // Save to DB
        response = await groupModel.create(data);

        // Add members
        if (!members || members.length == 0) {
            // Add owner as a member of group
            members = [userId];
        } else {
            members.push(userId);
        }
        // Save members
        await modifyMembers(response._id, members, userId);
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getGroups = async (userId, name, sort, page, limit) => {
    // Log the function name and the data
    logger.info(`getGroups - userId: ${userId}, name: ${name}, sort: ${JSON.stringify(sort)}, page: ${page}, limit: ${limit}`);

    // Set default name to empty string
    name = name ? name : '';

    // Set empty response
    let response = {};
    try {
        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Match object to aggregate with
        // Set it to match with name regex
        let matchObject = {
            name: {
                $regex: name,
                $options: 'i'
            }
        };
        // If userId exists then show that user's blogs
        if (userId) {
            matchObject.owner = mongoose.Types.ObjectId(userId);
        }

        // Sort
        let { key, order } = sort;
        // This will limit sort by
        switch (key) {
            case 'name':
            case 'createDate':
                break;
            default:
                key = 'createDate';
                order = -1;
                break;
        }

        // Add users info with lookup
        // Then sort them
        // Then change names of fields and select some of them
        let groups = await groupModel.aggregate([
            {
                $match: matchObject
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $sort: { [key]: order }
            },
            {
                $project: {
                    name: 1,
                    'user._id': 1,
                    'user.username': 1
                }
            },
            {
                $project: {
                    name: 1,
                    user: { $arrayElemAt: ['$user', 0] },
                }
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

module.exports.getGroupById = async (groupId) => {
    // Log the function name and the data
    logger.info(`getGroupById - groupId: ${groupId}`);

    // Set empty response
    let response = {};
    try {
        // Find group
        let group = await groupModel.findOne({ _id: groupId }).select('-_id -__v -createDate');
        if (!group) {
            logger.error('Group not found');
            return responseError(404, 'Group not found');
        }
        response = group;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.updateGroupById = async (groupId, userId, data, members) => {
    // Log the function name and the data
    logger.info(`updateGroupById - groupId: ${groupId},  userId: ${userId}, data: ${data}, members: ${members}`);

    // Set empty response
    let response = {};
    try {
        // First check if group exists
        let group = await groupModel.findOne({ _id: groupId });
        if (!group) {
            logger.warn('Group not found');
            return responseError(404, 'Group not found');
        }

        // Check if user is owner
        if (group.owner.toString() !== userId.toString()) {
            logger.error('User not allowed to change group');
            return responseError(403, 'User not allowed to change group');
        }

        // Update members
        // Check if client sent changes on members
        if (members) {
            // Remember to add owner to members - so it won't delete them
            // Even if owner already there, modifyMembers converts the array to a set
            // so duplicates will be removed anyway
            members.push(group.owner.toString());
            await modifyMembers(groupId, members);
        }
        // Last, update the name/description of group
        let res = await groupModel.updateOne({ _id: groupId }, { $set: data });
        response = { ok: res.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.deleteGroupById = async (groupId, userId) => {
    // Log the function name and the data
    logger.info(`deleteGroupById - groupId: ${groupId}, userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // First check if group exists
        let group = await groupModel.findOne({ _id: groupId });
        if (!group) {
            logger.warn('Group not found');
            return responseError(404, 'Group not found');
        }

        // Check if user is owner
        if (group.owner.toString() !== userId.toString()) {
            logger.error('User not allowed to change group');
            return responseError(403, 'User not allowed to change group');
        }

        // Delete the group
        let res = await groupModel.deleteOne({ _id: groupId });
        response = { ok: res.ok };

        // Delete all members in the group by sending empty array
        await modifyMembers(groupId, []);
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getGroupUsers = async (groupId, name, sort, page, limit) => {
    // Log the function name and the data
    logger.info(`getGroupUsers - groupId: ${groupId}, name: ${name}, sort: ${sort}, page: ${page}, limit: ${limit}`);

    // Set default name to empty string
    name = name ? name : '';

    // Set empty response
    let response = {};
    try {
        // Check group existance
        let group = await groupModel.findOne({ _id: groupId });
        if (!group) {
            logger.error('Group not found');
            return responseError(404, 'Group not found');
        }

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

        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Find all user-group by groupId - so we can find the users in group
        // Then sort them
        // Then load the user by userId
        // Then select only id and username from user
        // Then match the username if searching
        let users = await userGroupModel.aggregate([
            {
                $match: {
                    groupId: mongoose.Types.ObjectId(groupId)
                }
            },
            {
                $sort: { createDate: -1 }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    _id: { $arrayElemAt: ['$user._id', 0] },
                    username: { $arrayElemAt: ['$user.username', 0] },
                    owner: 1,
                    createDate: 1
                }
            },
            {
                $match: {
                    username: {
                        $regex: name,
                        $options: 'i'
                    }
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

module.exports.addMember = async (groupId, userId, newUser) => {
    // Log the function name and the data
    logger.info(`addMember - groupId: ${groupId}, userId: ${userId}, newUser: ${newUser}`);

    // Set empty response
    let response = {};
    try {
        // Check group existance
        let group = await groupModel.findOne({ _id: groupId });
        if (!group) {
            logger.error('Group not found');
            return responseError(404, 'Group not found');
        }

        // Check that user is the owner
        if (group.owner.toString() !== userId.toString()) {
            logger.error('User is not owner');
            return responseError(403, 'User is not owner');
        }

        // Check if user already in group
        let ug = await userGroupModel.findOne({ userId: newUser, groupId });
        if (ug) {
            logger.error('User is already in group');
            return responseError(405, 'User is already in group');
        }

        // Add member
        let data = {
            userId: newUser,
            groupId
        };
        await userGroupModel.create(data);

        // Send status 200 and ok
        response = { ok: 1 };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.removeMember = async (groupId, userId, delUser) => {
    // Log the function name and the data
    logger.info(`removeMember - groupId: ${groupId}, userId: ${userId}, delUser: ${delUser}`);

    // Set empty response
    let response = {};
    try {
        // Check group existance
        let group = await groupModel.findOne({ _id: groupId });
        if (!group) {
            logger.error('Group not found');
            return responseError(404, 'Group not found');
        }

        // Check that user is the owner or some user exists the group
        if (group.owner.toString() !== userId.toString() && userId.toString() !== delUser.toString()) {
            logger.error('User is not owner');
            return responseError(403, 'User is not owner');
        }

        // Check that delUser is not the owner
        if (delUser.toString() === group.owner.toString()) {
            logger.error('User can not delete owner');
            return responseError(403, 'User can not delete owner');
        }

        // Check if user in group
        let ug = await userGroupModel.findOne({ userId: delUser, groupId });
        if (!ug) {
            logger.error('User not found in group');
            return responseError(404, 'User not found in group');
        }

        // Remove member
        ug = await userGroupModel.deleteOne({ groupId, userId: delUser });

        // Send status 200 and ok
        response = { ok: ug.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

async function modifyMembers(groupId, dataMembers, owner) {
    logger.info('modifyMembers - groupId: ' + groupId + ', dataMembers: ' + dataMembers + ', owner: ' + owner);

    // Find existing users
    let members = await userGroupModel.find({ groupId });
    members = members.map(m => m.userId.toString());

    // Check if ids in dataMembers are actual members and not fake ids
    let validMembers = await userModel.find({ _id: { $in: dataMembers } });
    validMembers = validMembers.map(m => m._id.toString());

    // Create a set of members
    let memSet = new Set(members);
    let dataSet = new Set(validMembers);

    // Calculate difference between sets
    // memSet = [1,2,3] - old array
    // dataSet = [3,4,5] - new array
    // Diff = [4,5] - It means 4 and 5 are new users
    let addMembers = utils.difference(dataSet, memSet);

    // Diff = [1,2] - It means 1 and 2 are deleted
    let removeMembers = utils.difference(memSet, dataSet);

    // Convert sets back to arrays
    let addArray = Array.from(addMembers);
    let removeArray = Array.from(removeMembers);

    // If there are new users
    if (addArray && addArray.length > 0) {
        // Array of new user-group
        let newUsers = [];
        for (let i = 0; i < addArray.length; ++i) {
            const u = addArray[i];
            // Create user-group based on model
            const isOwner = (owner ? u.toString() === owner.toString() : false);
            let user = {
                groupId: mongoose.Types.ObjectId(groupId),
                userId: mongoose.Types.ObjectId(u),
                owner: isOwner
            }
            newUsers.push(user);
        }
        logger.info(`Adding ${newUsers.length} users to group`);
        // Save the array to DB
        await userGroupModel.insertMany(newUsers);
    }

    // If some users are deleted
    if (removeArray && removeArray.length > 0) {
        // Remove all users who are in removeArray and that are in group with id of groupId
        logger.info(`Removing ${removeArray.length} users from group`);
        await userGroupModel.deleteMany({ groupId, userId: { $in: removeArray } });
    }
    // There's no try-catch here because the function that calls this function already surrounded with try-catch
}