const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement');

const {
    getTimeBlocks,
    setTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
    getEmployeeSchedules,
    setEmployeeSchedules,
    setEmployeeSchedule,
    updateEmployeeSchedule,
    deleteEmployeeSchedule,
    copyWeekEmployeeSchedules
} = require('../../repositories/DAO_EmployeeSchedules')

const router = express.Router();


// Time Blocks Management
router.get('/get_time_blocks', authenticateToken, async (req, res) => {
    const { localId } = req.localId;

    const response = await getTimeBlocks(localId);

    if(response.success)
        return res.status(200).json({ timeBlocksData: response.timeBlocksData })
    else
        return res.status(500).json({ error: '/get_time_blocks (' + localId + '): ' + response.error });
});

router.post('/set_time_block', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { timeBlocksData } = req.body;

    const response = await setTimeBlock(localId, timeBlocksData);

    if(response.success)
        return res.status(200).json({ message: 'Created', timeBlocksData: response.timeBlocksData });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/update_time_block', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { timeBlocksData } = req.body;

    const response = await updateTimeBlock(localId, timeBlocksData);

    if(response.success)
        return res.status(200).json({ message: 'Updated' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/delete_time_block', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { timeBlocksData } = req.body;

    const response = await deleteTimeBlock(localId, timeBlocksData);

    if(response.success)
        return res.status(200).json({ message: 'Deleted' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

// Employee Schedules Management
router.get('/get_employee_schedules', authenticateToken, async (req, res) => {
    const { localId } = req.localId;

    const response = await getEmployeeSchedules(localId);

    if(response.success)
        return res.status(200).json({ employeeSchedulesData: response.employeeSchedulesData })
    else
        return res.status(500).json({ error: '/get_employee_schedules (' + localId + '): ' + response.error });
});

router.post('/set_employee_schedules', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { employeeSchedulesData } = req.body;

    const response = await setEmployeeSchedules(localId, employeeSchedulesData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/set_employee_schedule', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { employeeSchedulesData } = req.body;

    const response = await setEmployeeSchedule(localId, employeeSchedulesData);

    if(response.success)
        return res.status(200).json({ message: 'Created', employeeSchedulesData: response.employeeSchedulesData });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/update_employee_schedule', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { employeeSchedulesData } = req.body;

    const response = await updateEmployeeSchedule(localId, employeeSchedulesData);

    if(response.success)
        return res.status(200).json({ message: 'Updated' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/delete_employee_schedule', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { employeeSchedulesData } = req.body;

    const response = await deleteEmployeeSchedule(localId, employeeSchedulesData);

    if(response.success)
        return res.status(200).json({ message: 'Deleted' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/copy_week_employee_schedules', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { employeeSchedulesData } = req.body;

    const response = await copyWeekEmployeeSchedules(localId, employeeSchedulesData);

    if(response.success)
        return res.status(200).json({ message: 'Week copied', employeeSchedulesData: response.employeeSchedulesData });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

module.exports = router;