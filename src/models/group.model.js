const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        minlength: 5,
        maxlength: 120,
        required: true
    },
    description: {
        type: String,
        minlength: 5,
        maxlength: 120,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Group', groupSchema);