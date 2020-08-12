const logger = require('../common/logger')(__filename);
const socketServices = require('../services/socket.service');
const chatServices = require('../services/chat.service');
const CONSTANTS = require('../common/constants');
const security = require('../security/security');

let io = null;

module.exports.NOTIFICATION = 'notification';
module.exports.FRIEND = 'friend';
module.exports.MESSAGE = 'message';
module.exports.MESSAGE_READ = 'message_read';
module.exports.DELETE_MESSAGE = 'delete_message';
module.exports.BLOCK_USER = 'block_user';
module.exports.UNBLOCK_USER = 'unblock_user';
module.exports.USER_STATUS = 'user_status';

module.exports.setUp = function (_io) {
    logger.info('setUp');
    io = _io;
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
    if (io) {
        const sId = socketServices.getSocketId(to);
        if (sId) {
            io.to(sId).emit(event, data);
            return true;
        }
        logger.warn('User/socketId not available/connected');
    } else {
        logger.error('Socket not available/connected');
    }
    return false;
}

const socketEvents = (io) => {
    io.on('connection', (s) => {
        s.on(CONSTANTS.SOCKET_MESSAGE_READ, async (data) => await messageRead(s, data));
        s.on(CONSTANTS.SOCKET_JOIN, (data) => join(s, data));
        s.on(CONSTANTS.SOCKET_LEAVE, (data) => leave(s, data));
        s.on(CONSTANTS.SOCKET_LOGOUT, () => disconnect(s));
        s.on(CONSTANTS.SOCKET_DISCONNECT, () => disconnect(s));

        updateUserOnline(s);
    });
}

const updateUserOnline = (socket) => {
    logger.info('updateUserOnline');
    if (socket.decoded) {
        io.to(socket.decoded.uid).emit(this.USER_STATUS, { online: true });
    }
}

const messageRead = async (socket, data) => {
    logger.info('messageRead - data: ' + JSON.stringify(data));
    if (socket.decoded) {
        const { chatId, _id: msgId } = data;
        await chatServices.markMessageReadById(socket.decoded.uid, chatId, msgId);
    }
}

const join = (socket, data) => {
    logger.info('join - data: ' + JSON.stringify(data));
    if (socket.decoded) {
        const { userId } = data;
        socket.join(userId);
        const online = socketServices.getSocketId(userId) ? true : false;
        io.to(socket.id).emit(this.USER_STATUS, { online });
    }
}

const leave = (socket, data) => {
    logger.info('leave - data: ' + JSON.stringify(data));
    if (socket.decoded) {
        const { userId } = data;
        socket.leave(userId);
    }
}

const disconnect = async (socket) => {
    logger.info('disconnect');
    if (socket.decoded) {
        socketServices.disconnect(socket.decoded.uid);
        io.to(socket.decoded.uid).emit(this.USER_STATUS, { online: false });
    }
}