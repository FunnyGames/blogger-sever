// Declaration of methods here
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';

// List of addresses that guest is allowed to visit (not logged in user)
module.exports = [
    { url: '/', method: GET },
    { url: '/health', method: GET },
    { url: '/api/v1/users/login', method: POST },
    { url: '/api/v1/users/register', method: POST },
    { url: '/api/v1/users/reset/request', method: POST },
    { url: '/api/v1/users/reset/password/(:token)', method: POST },
    { url: '/api/v1/users/available', method: PUT },
    { url: '/api/v1/blogs/(:id)', method: GET },
    { url: '/api/v1/blogs', method: GET },
    { url: '/api/v1/comments/(:id)/get', method: PUT },
    { url: '/api/v1/reactions/(:id)', method: GET },
];