const morgan = require('morgan');
const tokenValidation = require('../middlewares/token-validation.middleware');
const userStatus = require('../middlewares/user-status.middleware');
const trimBody = require('../middlewares/trim.body.middleware');
const logger = require('../common/logger');
const cors = require('cors');
const express = require('express');
const cookieParser = require('cookie-parser');

// This will configure all middlewares
module.exports.configure = (app) => {
    // This allows to anyone send requests to server
    app.use(cors());

    // This allows us to use cookies
    app.use(cookieParser());

    // This is used for logger to get the API address and response status
    app.use(morgan('tiny', { 'stream': logger.stream }));

    // This is for validating token before allowing user to get to API
    app.use(tokenValidation);

    // This is for checking if user exists (not using cancelled account)
    app.use(userStatus);

    // This will decode the body of request
    app.use(express.json());

    // This will trim all body requests
    app.use(trimBody);
}