const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_STATIC_SECRET = process.env.JWT_STATIC_SECRET;
const JWT_AGENT_SECRET = process.env.JWT_AGENT_SECRET || JWT_SECRET;

function getBearerToken(req) {
    const authHeader = req.headers['authorization'];

    if (!authHeader)
        return null;

    return authHeader.split(' ')[1];
}


function authenticateToken(req, res, next) {
    const token = getBearerToken(req);

    if (!token) 
        return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ error: 'Token invalid or expired' });
        req.localId = user;
        next();
    });
}

function authenticateStaticToken(req, res, next) {
    const token = getBearerToken(req);

    if (!token) 
        return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, JWT_STATIC_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token invalid or expired' });
        next();
    });
}

function authenticateAgentToken(req, res, next) {
    const token = getBearerToken(req);

    if (!token)
        return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, JWT_AGENT_SECRET, (err, decoded) => {
        if (err)
            return res.status(401).json({ error: 'Token invalid or expired' });

        if (!decoded?.localId)
            return res.status(401).json({ error: 'Token payload invalid' });

        req.localId = { localId: decoded.localId };
        next();
    });
}

module.exports = {
    authenticateToken,
    authenticateStaticToken,
    authenticateAgentToken
}
