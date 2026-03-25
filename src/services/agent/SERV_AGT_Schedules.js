const express = require('express');
const { authenticateAgentToken } = require('../../config/MID_JWTManagement')
const { 
    getSchedules,
    getSpecialSchedules,
} = require('../../repositories/DAO_Schedules')

const router = express.Router();


router.get('/get_schedules', authenticateAgentToken, async(req, res) => {
    const { localId } = req.localId;

    let response = await getSchedules(localId);
    if(!response.success)
        return res.status(500).json({ error: '/agent/get_schedules (' + localId + '): ' + response.error });
    if(response.success && response.schedulesData.length === 0)
        return res.status(500).json({ error: '/agent/get_schedules (' + localId + '): ' + 'No hay ningún horario asociado a este local' });

    const schedulesData = response.schedulesData;
    
    response = await getSpecialSchedules(localId);
    if(!response.success)
        return res.status(500).json({ error: '/agent/get_schedules (' + localId + '): ' + response.error });

    const specialSchedulesData = response.specialSchedulesData;

    return res.json({ success: true, schedulesData, specialSchedulesData });

});

module.exports = router;
