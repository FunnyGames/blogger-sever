const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    subToUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true, // We want to reduce search time, we know which user we are looking for
        required: true
    },
    subToUsername: {
        type: String,
        required: true
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);