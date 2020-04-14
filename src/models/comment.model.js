const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        minlength: 5,
        maxlength: 1000,
        required: true
    },
    user: {
        _id: mongoose.Schema.Types.ObjectId,
        username: String
    },
    blogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog',
        index: true, // We want to reduce search time, we know what blog we are looking at
        required: true
    },
    lastUpdate: {
        type: Date
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comment', commentSchema);