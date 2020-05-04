const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    username1: {
        type: String,
        required: true
    },
    userId1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true
    },
    userBlocked1: {
        type: Boolean,
        required: true,
        default: false
    },
    username2: {
        type: String,
        required: true
    },
    userId2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true
    },
    userBlocked2: {
        type: Boolean,
        required: true,
        default: false
    },
    totalMessages: {
        type: Number,
        required: true,
        default: 0
    },
    totalNewMessages: {
        type: Number,
        required: true,
        default: 0
    },
    lastMessage: {
        type: String,
        maxlength: 50
    },
    lastUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    deleted: {
        type: Boolean,
        default: false
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Chat', chatSchema);