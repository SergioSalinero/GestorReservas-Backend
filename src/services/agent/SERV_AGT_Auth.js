const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const {
    getLocalIdByLocalPhoneNumber
} = require('../../repositories/DAO_LocalData');

const router = express.Router();

const JWT_AGENT_SECRET = process.env.JWT_AGENT_SECRET || process.env.JWT_SECRET;
const JWT_AGENT_EXPIRATION = process.env.JWT_AGENT_EXPIRATION || process.env.JWT_EXPIRATION;
const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET;

function safeCompare(valueA, valueB) {
    const bufferA = Buffer.from(String(valueA ?? ''), 'utf8');
    const bufferB = Buffer.from(String(valueB ?? ''), 'utf8');

    if (bufferA.length !== bufferB.length)
        return false;

    return crypto.timingSafeEqual(bufferA, bufferB);
}

router.post('/login', async (req, res) => {
    try {
        const { local_phone_number, agent_secret } = req.body;

        if (!local_phone_number || !agent_secret)
            return res.status(400).json({ error: 'local_phone_number y agent_secret son requeridos' });

        if (!JWT_AGENT_SECRET)
            return res.status(500).json({ error: 'JWT_AGENT_SECRET no está configurado' });

        if (!AGENT_SHARED_SECRET)
            return res.status(500).json({ error: 'AGENT_SHARED_SECRET no está configurado' });

        if (!safeCompare(agent_secret, AGENT_SHARED_SECRET))
            return res.status(401).json({ error: 'Credenciales de agente inválidas' });

        const response = await getLocalIdByLocalPhoneNumber(local_phone_number);
        if (!response.success)
            return res.status(response.status || 500).json({ error: '/agent/login (getLocalIdByLocalPhoneNumber): ' + response.error });

        if (!response.localData || response.localData.length === 0)
            return res.status(401).json({ error: 'Credenciales de agente inválidas' });

        const localId = response.localData[0].id;
        const signOptions = JWT_AGENT_EXPIRATION ? { expiresIn: JWT_AGENT_EXPIRATION } : undefined;

        const token = jwt.sign(
            { localId },
            JWT_AGENT_SECRET,
            signOptions
        );

        return res.status(200).json({ token });
    } catch (err) {
        console.error('Agent login error:', err);
        return res.status(500).json({ error: 'Agent login error', details: err.message });
    }
});

module.exports = router;
