const express = require('express');
const router = express.Router();

// Dummy service, has no meaning
router.get('/', (req, res) => {
    console.log(req.headers);
    res.status(200).send(req.headers);
});

// Example of health check for Amazon servers
router.get('/health', (req, res) => {
    res.status(200).send({ ok: 1 });
});

module.exports = router;