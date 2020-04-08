const logger = require('../common/logger')(__filename);
const mongoose = require('mongoose');
const blogModel = require('../models/blog.model');
const userModel = require('../models/user.model');
const groupModel = require('../models/group.model');
const userGroupModel = require('../models/usergroup.model');
const userBlogModel = require('../models/userblog.model');
const utils = require('../common/utils');
const { responseSuccess, responseError, SERVER_ERROR } = require('../common/response');

module.exports.createBlog = async (userId, data, members, groups) => {
    // Log the function name and the data
    logger.info(`createBlog - userId: ${userId}, data: ${JSON.stringify(data)}, members: ${members}, groups: ${groups}`);

    // Set empty response
    let response = {};
    try {
        // Set owner to userId
        data.owner = userId;

        // Check if blog is public
        if ((members && members.length > 0) || (groups && groups.length > 0) || data.permission === 'private') {
            data.permission = 'private';
        } else {
            data.permission = 'public';
        }

        // Save to DB
        response = await blogModel.create(data);

        // Add members
        if (data.permission === 'private') {
            // Make sure that array exists
            if (!members) members = [];
            if (!groups) groups = [];

            // Add owner to permissions
            members.push(userId);

            // Save members
            await modifyMembers(response._id, members, groups, userId);
        }
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getBlogs = async (userId, userIdToShow, guest, name, sort, page, limit) => {
    // Log the function name and the data
    logger.info(`getBlogs - userId: ${userId}, userIdToShow: ${userIdToShow}, guest: ${guest}, name: ${name}, sort: ${JSON.stringify(sort)}, page: ${page}, limit: ${limit}`);

    // Set default name to empty string
    name = name || '';

    // Set empty response
    let response = {};
    try {
        // Calculate the skip by page with limit
        let skip = (page - 1) * limit;

        // Match object to aggregate with
        // Set it to match with name regex
        let matchObject = {};
        if (name.length > 1 && name.includes('#')) {
            matchObject.tags = name.split('#')[1].toLowerCase();
        } else {
            matchObject = {
                name: {
                    $regex: name,
                    $options: 'i'
                }
            };
        }
        // If `userIdToShow` exists then show that user's blogs
        if (userIdToShow) {
            try {
                matchObject.owner = mongoose.Types.ObjectId(userIdToShow);
            } catch (error) {
                logger.error('Bad id of userIdToShow - ' + userIdToShow);
            }
        }

        let matchAccess = {};
        // If guest then show only public
        if (guest) {
            matchAccess.permission = 'public';
        } else {
            let userBlogs = await getUserBlogs(userId);
            let set = new Set(userBlogs); // Create a set to remove duplicates
            userBlogs = Array.from(set).map(u => mongoose.Types.ObjectId(u)); // Convert string back to ObjectId

            matchAccess = {
                $or: [
                    {
                        permission: 'public'
                    },
                    {
                        permission: 'private',
                        _id: { $in: userBlogs }
                    }
                ]
            };
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
        let blogs = await blogModel.aggregate([
            {
                $match: matchAccess
            },
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
                    createDate: 1,
                    'user._id': 1,
                    'user.username': 1
                }
            },
            {
                $project: {
                    name: 1,
                    createDate: 1,
                    user: { $arrayElemAt: ['$user', 0] },
                }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }, { $addFields: { page } }],
                    blogs: [{ $skip: skip }, { $limit: limit }]
                }
            },
            {
                $project: {
                    metadata: { $arrayElemAt: ['$metadata', 0] },
                    blogs: 1
                }
            }
        ]);
        // The result will come as array - [{ metadata: {...}, blogs: [...] }]
        // So convert the array to object
        blogs = blogs[0];

        // Check if metadata is missing (happens if nothing found)
        if (!blogs.metadata) {
            blogs.metadata = {
                total: 0,
                page
            }
        }

        // Set it to response
        response = blogs;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getBlogById = async (blogId, userId, guest) => {
    // Log the function name and the data
    logger.info(`getBlogById - blogId: ${blogId}, userId:${userId}, guest: ${guest}`);

    // Set empty response
    let response = {};
    try {
        // Find blog
        let blog = await blogModel.findOne({ _id: blogId }).select('-__v').populate('owner', 'username');
        if (!blog) {
            logger.error('Blog not found');
            return responseError(404, 'Blog not found');
        }
        if (blog.permission === 'private') {
            if (guest) {
                logger.error('User not allowed to view blog');
                return responseError(403, 'User not allowed to view blog');
            } else {
                let userBlogs = await getUserBlogs(userId, blogId);
                if (userBlogs.filter(b => blogId === b).length == 0) {
                    logger.error('User not allowed to view blog');
                    return responseError(403, 'User not allowed to view blog');
                }
            }
        }
        response = blog;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.updateBlogById = async (blogId, userId, data, members, groups) => {
    // Log the function name and the data
    logger.info(`updateBlogById - blogId: ${blogId},  userId: ${userId}, data: ${data}, members: ${members}, groups: ${groups}`);

    // Set empty response
    let response = {};
    try {
        // First check if blog exists
        let blog = await blogModel.findOne({ _id: blogId });
        if (!blog) {
            logger.warn('Blog not found');
            return responseError(404, 'Blog not found');
        }

        // Check if user is owner
        if (blog.owner.toString() !== userId.toString()) {
            logger.error('User not allowed to change blog');
            return responseError(403, 'User not allowed to change blog');
        }

        // Update members
        // Check if client sent changes on members
        if (members || groups || data.permission === 'private') {
            // Make sure array exists
            if (!members) members = [];
            if (!groups) groups = [];

            // Find if changed from public to private or vice versa
            if (members.length > 0 || groups.length > 0 || data.permission === 'private') {
                data.permission = 'private';

                // Remember to add owner to members - so it won't delete them
                // Even if owner already there, modifyMembers converts the array to a set
                // so duplicates will be removed anyway
                members.push(blog.owner.toString());
            } else {
                // If public then no need to add owner to members
                data.permission = 'public';
            }
            await modifyMembers(blogId, members, groups, userId);
        }

        // Last, update the name/entry of blog
        let res = await blogModel.updateOne({ _id: blogId }, { $set: data });
        response = { ok: res.ok };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.deleteBlogById = async (blogId, userId) => {
    // Log the function name and the data
    logger.info(`deleteBlogById - blogId: ${blogId}, userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // First check if blog exists
        let blog = await blogModel.findOne({ _id: blogId });
        if (!blog) {
            logger.warn('Blog not found');
            return responseError(404, 'Blog not found');
        }

        // Check if user is owner
        if (blog.owner.toString() !== userId.toString()) {
            logger.error('User not allowed to change blog');
            return responseError(403, 'User not allowed to change blog');
        }

        // Delete the blog
        let res = await blogModel.deleteOne({ _id: blogId });
        response = { ok: res.ok };

        // Delete all members in the blog by sending empty array
        await modifyMembers(blogId, []);
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

module.exports.getBlogUsers = async (blogId, userId) => {
    // Log the function name and the data
    logger.info(`getBlogUsers - blogId: ${blogId}, userId: ${userId}`);

    // Set empty response
    let response = {};
    try {
        // Check blog existance and permission
        let res = await this.getBlogById(blogId, userId, false);
        if (res.status !== 200) {
            return responseError(res.status, res.data.error);
        }

        // Find all user-blog by blogId - so we can find the users in blog
        // Then sort by create date (date user added)
        // Then load the user by userId
        // Then select only id and username from user
        let users = await userBlogModel.aggregate([
            {
                $match: {
                    blogId: mongoose.Types.ObjectId(blogId),
                    userId: { $exists: true, $ne: null }
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
                    name: { $arrayElemAt: ['$user.username', 0] },
                    owner: 1
                }
            }
        ]);

        // Do the same for groups
        let groups = await userBlogModel.aggregate([
            {
                $match: {
                    blogId: mongoose.Types.ObjectId(blogId),
                    groupId: { $exists: true, $ne: null }
                }
            },
            {
                $sort: { createDate: -1 }
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
                    name: { $arrayElemAt: ['$group.name', 0] }
                }
            }
        ]);

        // Set it to response
        response = { users, groups };
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return responseError(500, SERVER_ERROR);
    }
    return responseSuccess(response);
}

async function getUserBlogs(userId, blogId) {
    // First, we find all the groups the user is in
    let userGroups = await userGroupModel.find({ userId });
    userGroups = userGroups.map(u => mongoose.Types.ObjectId(u.groupId)); // list of groups ids the user is in

    let matchObject = {
        $or: [
            {
                userId: mongoose.Types.ObjectId(userId)
            },
            {
                groupId: { $in: userGroups }
            }
        ]
    };
    // Include blog id to reduce documents
    if (blogId) {
        matchObject.blogId = mongoose.Types.ObjectId(blogId);
    }

    // Then we find all the blogs the user or the group is allowed to access
    let userBlogs = await userBlogModel.aggregate([
        {
            $match: matchObject
        }
    ]);
    return userBlogs.map(u => u.blogId.toString()); // list of private blogs ids the user has access
}

async function modifyMembers(blogId, dataMembers, dataGroups, owner) {
    logger.info('modifyMembers - blogId: ' + blogId + ', dataMembers: ' + dataMembers + ', dataGroups: ' + dataGroups + ', owner: ' + owner);

    // Find existing users
    let ub = await userBlogModel.find({ blogId });
    let members = ub.map(m => m.userId ? m.userId.toString() : null).filter(m => m); // we filter because userId might be null if groupId has id
    let groups = ub.map(m => m.groupId ? m.groupId.toString() : null).filter(m => m); // same here - if userId has id then groupdId is null

    // Check if ids in dataMembers are actual members and not fake ids
    let validMembers = await userModel.find({ _id: { $in: dataMembers } });
    validMembers = validMembers.map(m => m._id.toString());

    // Check if ids in dataGroups are actual groups and not fake ids
    let validGroups = await groupModel.find({ _id: { $in: dataGroups } });
    validGroups = validGroups.map(m => m._id.toString());

    // Create a set of members
    let memSet = new Set(members);
    let dataSet = new Set(validMembers);
    let groSet = new Set(groups);
    let dataGroSet = new Set(validGroups);

    // Calculate difference between sets
    // memSet = [1,2,3] - old array
    // dataSet = [3,4,5] - new array
    // Diff = [4,5] - It means 4 and 5 are new users
    let addMembers = utils.difference(dataSet, memSet);
    let addGroups = utils.difference(dataGroSet, groSet);

    // Diff = [1,2] - It means 1 and 2 are deleted
    let removeMembers = utils.difference(memSet, dataSet);
    let removeGroups = utils.difference(groSet, dataGroSet);

    // Convert sets back to arrays
    let addArray = Array.from(addMembers);
    let removeArray = Array.from(removeMembers);
    let addGroupArray = Array.from(addGroups);
    let removeGroupArray = Array.from(removeGroups);

    // If there are new users
    if (addArray && addArray.length > 0) {
        // Array of new user-blog
        let newUsers = [];
        for (let i = 0; i < addArray.length; ++i) {
            const u = addArray[i];
            // Create user-blog based on model
            const isOwner = (owner ? u.toString() === owner.toString() : false);
            let user = {
                blogId: mongoose.Types.ObjectId(blogId),
                userId: mongoose.Types.ObjectId(u),
                owner: isOwner
            }
            newUsers.push(user);
        }
        logger.info(`Adding ${newUsers.length} users to blog`);
        // Save the array to DB
        await userBlogModel.insertMany(newUsers);
    }

    // If there are new groups
    if (addGroupArray && addGroupArray.length > 0) {
        // Array of new user-blog
        let newGroups = [];
        for (let i = 0; i < addGroupArray.length; ++i) {
            const g = addGroupArray[i];
            // Create user-blog based on model
            let user = {
                blogId: mongoose.Types.ObjectId(blogId),
                groupId: mongoose.Types.ObjectId(g),
                owner: false
            }
            newGroups.push(user);
        }
        logger.info(`Adding ${newGroups.length} groups to blog`);
        // Save the array to DB
        await userBlogModel.insertMany(newGroups);
    }

    // If some users are deleted
    if (removeArray && removeArray.length > 0) {
        // Remove all users who are in removeArray and that are in blog with id of blogId
        logger.info(`Removing ${removeArray.length} users from blog`);
        await userBlogModel.deleteMany({ blogId, userId: { $in: removeArray } });
    }

    // If some groups are deleted
    if (removeGroupArray && removeGroupArray.length > 0) {
        // Remove all users who are in removeGroupArray and that are in blog with id of blogId
        logger.info(`Removing ${removeGroupArray.length} groups from blog`);
        await userBlogModel.deleteMany({ blogId, groupId: { $in: removeGroupArray } });
    }
    // There's no try-catch here because the function that calls this function already surrounded with try-catch
}