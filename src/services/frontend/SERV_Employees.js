const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement');
const { 
    setEmployees,
    getEmployees,
    getEmployeeById,
    setEmployee,
    updateEmployee,
    deleteEmployees
} = require('../../repositories/DAO_Employees')

const router = express.Router();


router.post('/set_employees', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { employeesData } = req.body;

    const response = await setEmployees(localId, employeesData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.get('/get_employees', authenticateToken, async(req, res) => {
    const { localId } = req.localId;

    const response = await getEmployees(localId);

    if(response.success)
        return res.status(200).json({ employeesData: response.employeesData })
    else
        return res.status(500).json({ error: '/get_employees (' + localId + '): ' + response.error });
});

router.get('/get_employee', authenticateToken, async(req, res) => {
    const { localId } = req.localId;
    const id = req.query.id;

    const response = await getEmployeeById(localId, id);

    if(response.success)
        return res.status(200).json({ employeesData: response.employeeData })
    else
        return res.status(500).json({ error: '/get_employee (' + localId + '): ' + response.error });
});

router.post('/set_employee', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { employeesData } = req.body;

    const response = await setEmployee(localId, employeesData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/update_employee', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { employeesData } = req.body;

    const response = await updateEmployee(localId, employeesData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/delete_employees', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { employeesData } = req.body;

    const response = await deleteEmployees(localId, employeesData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error, deleted: response.deleted, skipped: response.skipped });
});

module.exports = router;