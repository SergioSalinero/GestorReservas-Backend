const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement')
const {
    setSpecialSchedules,
    getSpecialSchedules,
    setSpecialSchedule,
    deleteSpecialSchedules,
    setSchedules,
    getSchedules,
    setSchedule
} = require('../../repositories/DAO_Schedules');

const router = express.Router();


router.post('/set_special_schedules', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { specialSchedulesData } = req.body;

    const response = await setSpecialSchedules(localId, specialSchedulesData);

    if (response.success)
        return res.status(201).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error })
});

router.get('/get_special_schedules', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    
    const response = await getSpecialSchedules(localId);

    if (response.success)
        return res.status(200).json({ specialSchedulesData: response.specialSchedulesData });
    else
        return res.status(500).json({ error: '/get_specialSchedules (' + localId + '): ' + response.error});
});

router.post('/set_special_schedule', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { specialSchedulesData } = req.body;

    const response = await setSpecialSchedule(localId, specialSchedulesData);

    if (response.success)
        return res.status(200).json({ message: 'Updated' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/delete_special_schedules', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { specialSchedulesData } = req.body;

    const response = await deleteSpecialSchedules(localId, specialSchedulesData);

    if(response.success)
        return res.status(200).json({ message: response.messages });
    else
        return res.status(500).json({ error: '/delete_special_schedules (' + localId + '): ' + 'One or more special schedules failed' });
});

router.post('/set_schedules', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { schedulesData } = req.body;

    if (schedulesData.length != 7)
        return res.status(500).json({ error: '/set_schedules (' + localId + '): ' + 'They must be given seven days a week.' });

    const response = await setSchedules(localId, schedulesData);

    if (response.success)
        return res.status(201).json({ message: 'Created' });
    else
        return res.status(500).json({ error: '/set_schedules (' + localId + '): ' + response.error })
});

router.get('/get_schedules', authenticateToken, async (req, res) => {
    const { localId } = req.localId;

    const response = await getSchedules(localId);

    if (response.success)
        return res.status(200).json({ schedulesData: response.schedulesData });
    else
        return res.status(500).json({ error: '/get_schedules (' + localId + '): ' + response.error});
});

router.post('/set_schedule', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { scheduleData } = req.body;

    const response = await setSchedule(localId, scheduleData);

    if (response.success)
        return res.status(200).json({ message: 'Updated' });
    else
        return res.status(500).json({ error: '/set_schedule (' + localId + '): ' + response.error});
});


module.exports = router;