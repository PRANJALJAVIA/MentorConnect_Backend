const jwt = require('jsonwebtoken');

function checkAuth(req, res, next){
    const authToken = req.cookie.authToken;
    const refreshToken = req.cookie.refreshToken;

    next();
}

module.exports = checkAuth;