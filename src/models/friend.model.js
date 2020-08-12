const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
    userId1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    username1: {
        type: String,
        required: true
    },
    userId2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    username2: {
        type: String,
        required: true
    },
    pending: {
        type: Boolean,
        required: true,
        default: true
    },
    userRequested: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Friend', friendSchema);