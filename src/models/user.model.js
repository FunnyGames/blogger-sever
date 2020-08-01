const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        minlength: 5,
        maxlength: 20,
        required: true
    },
    username_lower: {
        type: String,
        minlength: 5,
        maxlength: 20,
        lowercase: true,
        required: true,
        unique: true, // This is required as we log in with username and not id
        index: true
    },
    password: {
        type: String,
        minlength: 8,
        maxlength: 120,
        required: true
    },
    firstName: {
        type: String,
        minlength: 1,
        maxlength: 50,
        required: true
    },
    lastName: {
        type: String,
        minlength: 1,
        maxlength: 50,
        required: true
    },
    email: {
        type: String,
        minlength: 5,
        maxlength: 120,
    },
    email_lower: {
        type: String,
        minlength: 5,
        maxlength: 120,
        lowercase: true,
        unique: true, // This is required as we don't allow duplicates of emails for 2 different users
        required: true,
        index: true
    },
    avatar: {
        type: String,
    },
    avatarId: {
        type: String,
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);