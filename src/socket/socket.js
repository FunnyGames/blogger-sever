const logger = require('../common/logger')(__filename);
const socketServices = require('../services/socket.service');
const CONSTANTS = require('../common/constants');
const security = require('../security/security');

let socket = null;

module.exports.NOTIFICATION = 'notification';
module.exports.MESSAGE = 'message';

module.exports.setUp = function (io) {
    logger.info('setUp');
    socket = io;
    io.use(async (socket, next) => {
        let token = socket.handshake.headers[CONSTANTS.HEADER_AUTH];
        if (token) {
            try {
                const decoded = security.verifyToken(token);
                if (decoded) {
                    let res = socketServices.addSocketId(decoded.uid, socket.id);
                    if (res) {
                        socket.decoded = decoded;
                        return next();
                    }
                    logger.error('Socket not added to db');
                    return next(new Error('Server error'));
                }
            } catch (error) {
                logger.error(error.message);
            }
        }
        logger.error('Authentication error');
        return next(new Error('Authentication error'));
    });

    socketEvents(io);
}

module.exports.send = (to, event, data) => {
    logger.info(`send - to: ${to}, event: ${event}, data: ${JSON.stringify(data)}`);
    if (socket) {
        const sId = socketServices.getSocketId(to);
        if (sId) {
            socket.to(sId).emit(event, data);
            return true;
        }
        logger.warn('User / socketId not available / connected');
    } else {
        logger.error('Socket not available/connected');
    }
    return false;
}

const socketEvents = (io) => {
    io.on('connection', (s) => {
        s.on(CONSTANTS.SOCKET_MESSAGE, (data) => message(s, data));
        s.on(CONSTANTS.SOCKET_LOGOUT, () => disconnect(s));
        s.on(CONSTANTS.SOCKET_DISCONNECT, () => disconnect(s));
    });
}

const message = async (socket, data) => {
    logger.info('message - data: ' + data);
    if (socket.decoded) {
        // TODO - send message
    }
}

const disconnect = async (socket) => {
    logger.info('disconnect');
    if (socket.decoded) {
        socketServices.disconnect(socket.decoded.uid);
    }
}