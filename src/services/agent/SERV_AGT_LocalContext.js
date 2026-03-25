const express = require('express');
const { authenticateAgentToken } = require('../../config/MID_JWTManagement');
const {
    getLocalName
} = require('../../repositories/DAO_LocalData');
const {
    getOpenRouterKeyByLocalId,
    setOpenRouterKeyByLocalId
} = require('../../repositories/DAO_OpenRouter');
const {
    createOpenRouterApiKey
} = require('../../utils/UTI_OpenRouter');

const router = express.Router();

router.get('/get_local_context', authenticateAgentToken, async (req, res) => {
    const { localId } = req.localId;

    let response = await getLocalName(localId);
    if (!response.success)
        return res.status(500).json({ error: '/agent/get_local_context (' + localId + ') (getLocalName): ' + response.error });
    const localName = response.localName;

    response = await getOpenRouterKeyByLocalId(localId);
    if (!response.success)
        return res.status(500).json({ error: '/agent/get_local_context (' + localId + ') (getOpenRouterKeyByLocalId): ' + response.error });

    let openRouterKey = response.openRouterData[0]?.key || null;

    if (!openRouterKey) {
        response = await createOpenRouterApiKey(localId);
        if (!response.success)
            return res.status(500).json({ error: '/agent/get_local_context (' + localId + ') (createOpenRouterApiKey): ' + response.error });

        openRouterKey = response.key;

        response = await setOpenRouterKeyByLocalId(localId, openRouterKey);
        if (!response.success)
            return res.status(500).json({ error: '/agent/get_local_context (' + localId + ') (setOpenRouterKeyByLocalId): ' + response.error });
    }

    return res.status(200).json({
        registered: true,
        local_name: localName,
        openrouter_key: openRouterKey
    });
});

module.exports = router;
