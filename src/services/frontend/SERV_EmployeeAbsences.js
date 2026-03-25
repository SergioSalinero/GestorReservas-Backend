const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement');
const { 
    setEmployeeAbsences,
    getEmployeeAbsences,
    setEmployeeAbsence,
    updateEmployeeAbsence,
    deleteEmployeeAbsence
} = require('../../repositories/DAO_EmployeeAbsences');

const router = express.Router();


router.post('/set_employee_absences', authenticateToken, async (req, res) => {
    const { localId }  = req.localId;
    const { employeeAbsencesData } = req.body;

    const response = await setEmployeeAbsences(localId, employeeAbsencesData);

    if (response.success)
        return res.status(201).json({ message: 'Created' });
    else
        return res.status(500).json({ error: '/set_employee_absences (' + employeeAbsencesData[0].employee_id + '): ' + response.error })
});

router.get('/get_employee_absences', authenticateToken, async (req, res) => {
    const { localId }  = req.localId;

    const response = await getEmployeeAbsences(localId);

    if (response.success)
        return res.status(200).json({ employeeAbsencesData: response.employeeAbsencesData });
    else
        return res.status(500).json({ error: '/get_employee_absences (' + employeeId + '): ' + response.error});
});

router.post('/set_employee_absence', authenticateToken, async (req, res) => {
    const { localId }  = req.localId;
    const { employeeAbsenceData } = req.body;

    const response = await setEmployeeAbsence(localId, employeeAbsenceData);

    if (response.success)
        return res.status(201).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error })
});

router.post('/update_employee_absence', authenticateToken, async (req, res) => {
    const { localId }  = req.localId;
    const { employeeAbsenceData } = req.body;

    const response = await updateEmployeeAbsence(localId, employeeAbsenceData);

    if (response.success)
        return res.status(201).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error })
});

router.post('/delete_employee_absences', authenticateToken, async (req, res) => {
    const { localId }  = req.localId;
    const { employeeAbsencesData } = req.body;

    const response = await deleteEmployeeAbsence(localId, employeeAbsencesData);

    if (response.success)
        return res.status(201).json({ message: 'Created' });
    else
        return res.status(500).json({ error: '/delete_employee_absence (' + localId + '): ' + response.error })
});

module.exports = router;