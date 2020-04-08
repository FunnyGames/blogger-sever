const express = require('express');
const router = express.Router();

// 'localhost:3000/api/v1/users'
router.use('/users', require('./users'));

// 'localhost:3000/api/v1/groups'
router.use('/groups', require('./groups'));

// 'localhost:3000/api/v1/blogs'
router.use('/blogs', require('./blogs'));

module.exports = router;