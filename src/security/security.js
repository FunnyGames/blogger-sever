const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('config');
const unsecureUrls = require('./unsecuredUrls');
const UrlPattern = require('url-pattern');

// This will sign with data and key from config and return the JWT
module.exports.signJwt = (data) => {
    return jwt.sign(data, config.get('jwtPrivateKey'));
}

// This checks if the url is unsecured - meaning that guest can get to API
module.exports.isPublicUrl = (req) => {
    // Check if is public url
    return isUrlAllowed(req, unsecureUrls.guest);
}

// This checks if the url is unsecured - meaning that user that needs to confirm email can get to API
module.exports.isConfirmEmailUserUrl = (req) => {
    return isUrlAllowed(req, unsecureUrls.confirmEmail);
}

function isUrlAllowed(req, urls) {
    const url = req.url.split('?')[0];
    for (let i = 0; i < urls.length; ++i) {
        let obj = urls[i];
        let pattern = new UrlPattern(obj.url);
        if (pattern.match(url)) {
            if (req.method === obj.method) return true;
        }
    }
    return false;
}

// Hash the password using bcrypt
module.exports.crypt = async (password) => {
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);
    return hashed;
}

// Validate password
module.exports.validatePassword = async (password1, password2) => {
    return await bcrypt.compare(password1, password2);
}

module.exports.verifyToken = (token) => {
    return jwt.verify(token, config.get('jwtPrivateKey'));
}