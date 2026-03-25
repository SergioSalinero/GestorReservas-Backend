const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement')
const {
    setCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomers
} = require('../../repositories/DAO_Customers');

const router = express.Router();


router.post('/set_customer', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { customerData } = req.body;

    const response = await setCustomer(localId, customerData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/update_customer', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { customerData } = req.body;

    const response = await updateCustomer(localId, customerData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.get('/get_customers', authenticateToken, async(req, res) => {
    const { localId } = req.localId;

    const response = await getCustomers(localId);

    if(response.success)
        return res.status(200).json({ customersData: response.customersData })
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.get('/get_customer', authenticateToken, async(req, res) => {
    const { localId } = req.localId;
    const id = req.query.id;

    const response = await getCustomerById(localId, id);

    if(response.success)
        return res.status(200).json({ customersData: response.customersData })
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/delete_customers', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { customerData } = req.body;

    const response = await deleteCustomers(localId, customerData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error, deleted: response.deleted, skipped: response.skipped });
});

module.exports = router;