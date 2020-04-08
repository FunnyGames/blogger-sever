const error = require('../middlewares/error.middleware');
const api = require('../routes/api');
const mainRoute = require('../routes');

// This configs all routes
module.exports = function (app) {
    // All the APIs will go here
    app.use('/api', api);
    // This is usually for main services API
    // Like Amazon server checking if the sever is alive
    app.use('/', mainRoute);
    // In case the server has exception error that was not handled - it will response 500
    app.use(error);
    // If non of the API responded, it means the client enter non existance address - will respond 404
    app.use((req, res, next) => {
        res.status(404).send({ error: 'Not found', data: null });
    });
}