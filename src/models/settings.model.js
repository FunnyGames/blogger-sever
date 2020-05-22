const mongoose = require('mongoose');

const defaultSettings = ['web', 'email'];

const settingSchema = new mongoose.Schema({
    commentSettings: {
        type: Array,
        default: defaultSettings,
        required: true
    },
    reactSettings: {
        type: Array,
        default: defaultSettings,
        required: true
    },
    groupSettings: {
        type: Array,
        default: defaultSettings,
        required: true
    },
    blogSettings: {
        type: Array,
        default: defaultSettings,
        required: true
    },
    friendSettings: {
        type: Array,
        default: defaultSettings,
        required: true
    },
    customSettings: {
        type: Array,
        default: defaultSettings,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Setting', settingSchema);