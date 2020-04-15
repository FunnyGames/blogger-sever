const mongoose = require('mongoose');
const reactions = require('../constants/reactions');

const reactionSchema = new mongoose.Schema({
    react: {
        type: String,
        enum: reactions.reactions,
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