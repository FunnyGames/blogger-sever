const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        minlength: 1
    },
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        index: true, // We want to reduce search time, we know the chat we are looking for
        required: true
    },
    read: {
        type: Boolean,
        required: true,
        default: false
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);