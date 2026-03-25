const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement')
const { 
    getLocalName,
    getLocalData,
    setLocalData
} = require('../../repositories/DAO_LocalData')

const router = express.Router();


router.get('/get_local_name', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;

    const response = await getLocalName(localId);

    if(response.success && response.localName != null)
        return res.status(200).json({ localName: response.localName });
    else
        return res.status(500).json({ error: '/get_local_name (' + localId + '): ' + response.error });
});

router.get('/get_local_data', authenticateToken, async(req, res) => {
    const { localId } = req.localId;

    const response = await getLocalData(localId);

    if(response.success && response.localData != null)
        return res.status(200).json({ localData: response.localData })
    else
        return res.status(500).json({ error: '/get_local_data (' + localId + '): ' + response.error });
});

router.post('/set_local_data', authenticateToken, async(req, res) => {
    const { localId } = req.localId;
    const { localData } = req.body;

    const response = await setLocalData(localId, localData);

    if(response.success)
        return res.status(200).json({ message: 'Updated' })
    else
        return res.status(500).json({ error: '/set_local_data (' + localId + '): ' + response.error });
});

router.get('/get_local_id', authenticateToken, async(req, res) => {
    const { localId } = req.localId;

    if(localId != null)
        return res.status(200).json({ localData: localId });
    else
        return res.status(500).json({ error: '/get_local_id: Local ID is null' });
});

module.exports = router;