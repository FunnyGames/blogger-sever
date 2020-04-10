const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
    react: {
        type: String,
        enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
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
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Reaction', reactionSchema);