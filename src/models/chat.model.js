const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username1: {
        type: String,
        required: true
    },
    userId1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username2: {
        type: String,
        required: true
    },
    userId2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalMessages: {
        type: Number,
        required: true,
        default: 0
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);