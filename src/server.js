const express = require('express');
const app = express();
const logger = require('./common/logger')(__filename);
const db = require('./startup/db');
const configMiddleware = require('./startup/middlewares');

logger.info('Starting server...');

async function connectDB() {
    const dbConnected = await db();
    if (!dbConnected) {
        logger.error('Connection to DB failed. Exiting.');
        process.exit(1);
    }
}
connectDB();

require('./startup/joi-validation')();
configMiddleware.configure(app);
require('./startup/routes')(app);
require('./startup/config')();


const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    path: '/socket',
    handlePreflightRequest: function (req, res) {
        var headers = {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': req.headers.origin,
            'Access-Control-Allow-Credentials': true
        };
        res.writeHead(200, headers);
        res.end();
    }
});
require('./socket/socket').setUp(io);

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Listening on port ${port}...`));

module.exports = server;