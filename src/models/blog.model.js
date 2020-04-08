const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    name: {
        type: String,
        minlength: 5,
        maxlength: 120,
        required: true
    },
    entry: {
        type: String,
        minlength: 5,
        required: true
    },
    permission: {
        type: String,
        enum: ['private', 'public'],
        required: true
    },
    tags: {
        type: Array
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

module.exports = mongoose.model('Blog', blogSchema);