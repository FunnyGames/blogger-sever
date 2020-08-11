// Declaration of methods here
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';

// List of addresses that guest is allowed to visit (not logged in user)
const guest = [
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
    { url: '/api/v1/settings/unsubscribe', method: GET },
];

// List of addresses that user who didn't confirm his email is allowed to visit
const confirmEmail = [
    ...guest,
    { url: '/api/v1/users/profile', method: GET },
    { url: '/api/v1/users/update/profile', method: PUT },
    { url: '/api/v1/users/update/password', method: PUT },
    { url: '/api/v1/users/cancel', method: PUT },
    { url: '/api/v1/users/subscriptions', method: GET },
    { url: '/api/v1/users/friends', method: GET },
    { url: '/api/v1/users/friends/requests', method: GET },
    { url: '/api/v1/users/friends/total', method: GET },
    { url: '/api/v1/chat/blocked', method: GET },
    { url: '/api/v1/chat/total', method: GET },
    { url: '/api/v1/users/email/resend', method: GET },
    { url: '/api/v1/users/email/confirm/(:token)', method: GET },
    { url: '/api/v1/settings', method: GET },
    { url: '/api/v1/settings', method: POST },
    { url: '/api/v1/notifications', method: GET },
    { url: '/api/v1/notifications/short', method: GET },
    { url: '/api/v1/notifications/total', method: GET },
    { url: '/api/v1/notifications/readall', method: GET },
    { url: '/api/v1/notifications/(:id)/read', method: GET },
];


module.exports.guest = guest;
module.exports.confirmEmail = confirmEmail;