const winston = require('winston');
const path = require('path');
require('express-async-errors');

// This is logger formatter - the logs will look like:
// 2019-12-09T17:57:45.537Z [server.js] info: Listening on port 3000...
// ^ timestamp              ^ label     ^level ^ message
const serverFormat = winston.format.printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

// This function will get filename and use it as label
function logger(filename) {
    // This is a default way to create a winston logger
    const log = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.label({ label: path.basename(filename) }),
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            // This sets the format of output to console
            new winston.transports.Console(
                {
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp(),
                        serverFormat
                    ),
                    level: process.env.NODE_ENV === 'prod' ? 'error' : 'debug'
                }
            )
        ],
        exceptionHandlers: [
            // This sets the file for output of exceptions
            new winston.transports.File({ filename: 'logs/exceptions.log' }),
            // This sets the format of output to console
            new winston.transports.Console(
                {
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp(),
                        serverFormat
                    ),
                    level: process.env.NODE_ENV === 'prod' ? 'error' : 'debug'
                }
            )
        ]
    });
    return log;
}

// This is the default logger for the server
module.exports = logger;
// The below line is needed for allow 'morgan' to use winston--
module.exports.stream = {
    write: function (message, encoding) {
        logger('morgan').info(message);
    }
}