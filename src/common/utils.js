const cryptoJS = require('crypto-js');
const config = require('config');

module.exports.isSuperset = (set, subset) => {
    for (var elem of subset) {
        if (!set.has(elem)) {
            return false;
        }
    }
    return true;
}

module.exports.union = (setA, setB) => {
    var _union = new Set(setA);
    for (var elem of setB) {
        _union.add(elem);
    }
    return _union;
}

module.exports.intersection = (setA, setB) => {
    var _intersection = new Set();
    for (var elem of setB) {
        if (setA.has(elem)) {
            _intersection.add(elem);
        }
    }
    return _intersection;
}

module.exports.symmetricDifference = (setA, setB) => {
    var _difference = new Set(setA);
    for (var elem of setB) {
        if (_difference.has(elem)) {
            _difference.delete(elem);
        } else {
            _difference.add(elem);
        }
    }
    return _difference;
}

module.exports.difference = (setA, setB) => {
    var _difference = new Set(setA);
    for (var elem of setB) {
        _difference.delete(elem);
    }
    return _difference;
}

module.exports.getSort = (query) => {
    if (!query || !query.sortBy) {
        return {};
    }
    let order = query.sortOrder === 'dsc' ? -1 : 1;
    return {
        key: query.sortBy,
        order
    };
}

module.exports.isGeust = (decoded) => {
    return (decoded ? false : true);
}

module.exports.shortenMessage = (msg, length = 50) => {
    if (!msg) return '';
    return (msg.length > length ? msg.substring(0, length - 3) + '...' : msg);
}

module.exports.encodeResetPasswordToken = (key, email, expire) => {
    const buff = new Buffer(key + ';' + email + ';' + expire.getTime());
    return buff.toString('base64');
}

module.exports.decodeResetPasswordToken = (token) => {
    const buff = Buffer.from(token, 'base64');
    const text = buff.toString('ascii');
    const splited = text.split(';');
    const key = splited[0];
    const email = splited[1];
    const expire = splited[2];
    return {
        key,
        email,
        expire
    };
}

module.exports.encodeUscubscribeEmailToken = (email, setting, time) => {
    const signKey = config.get('emailSignKey');
    const msg = email + ';' + setting;
    const ciphertext = cryptoJS.AES.encrypt(msg, signKey + time).toString();
    const buff = Buffer.from(ciphertext);
    return buff.toString('base64');
}

module.exports.decodeUscubscribeEmailToken = (token, time) => {
    const signKey = config.get('emailSignKey');
    const buff = Buffer.from(token, 'base64');
    const text = buff.toString('ascii');
    const bytes = cryptoJS.AES.decrypt(text, signKey + time);
    const originalText = bytes.toString(cryptoJS.enc.Utf8);

    const splited = originalText.split(';');
    if (splited.length != 2) return null;
    const email = splited[0];
    const setting = splited[1];
    if (!email || !setting) return null;
    return {
        email,
        setting
    };
}