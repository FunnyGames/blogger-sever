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

module.exports.encodeToken = (key, email, expire) => {
    const buff = new Buffer(key + ';' + email + ';' + expire.getTime());
    return buff.toString('base64');
}

module.exports.decodeToken = (token) => {
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