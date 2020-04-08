const express = require('express');
const router = express.Router();

const cValidator = require('../../../../validators/common.validator');
const bValidator = require('../../../../validators/blog.validator');
const controller = require('../../../../controllers/blog.controller');

router.post('/', bValidator.createBlog, controller.createBlog);
router.get('/', cValidator.pagination, controller.getBlogs);

router.get('/:id', cValidator.paramId, controller.getBlogById);
router.put('/:id', cValidator.paramId, bValidator.updateBlog, controller.updateBlogById);
router.delete('/:id', cValidator.paramId, controller.deleteBlogById);

router.get('/:id/members', cValidator.paramId, controller.getBlogUsers);

module.exports = router;