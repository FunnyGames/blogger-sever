const mongoose = require('mongoose');
const notifications = require('../constants/notifications');

const notificationSchema = new mongoose.Schema({
    content: Object,
    details: Object,
    kind: {
        type: String,
        enum: notifications.notifications,
        required: true
    },
    fromUsername: {
        type: String,
        required: true
    },
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true, // We want to reduce search time, we know the user we are looking for
        required: true
    },
    seen: {
        type: Boolean,
        required: true,
        default: false
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

module.exports = mongoose.model('Notification', notificationSchema);