const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement')
const { 
    setServices,
    getServices,
    getServiceById,
    setService,
    updateService,
    deleteServices
} = require('../../repositories/DAO_Services')

const router = express.Router();

const REQUIRED_DURATION_MINUTES = 30;
function hasRequiredDuration(serviceData) {
    return Number(serviceData?.duration_minutes) === REQUIRED_DURATION_MINUTES;
}


router.post('/set_services', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { servicesData } = req.body;

    if (!Array.isArray(servicesData) || servicesData.some((serviceData) => !hasRequiredDuration(serviceData))) {
        return res.status(400).json({
            code: 4001,
            error: `El parámetro serviceData.duration_minutes debe ser exactamente ${REQUIRED_DURATION_MINUTES}.`
        });
    }

    const response = await setServices(localId, servicesData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.get('/get_services', authenticateToken, async(req, res) => {
    const { localId } = req.localId;

    const response = await getServices(localId);

    if(response.success)
        return res.status(200).json({ servicesData: response.servicesData })
    else
        return res.status(500).json({ error: '/get_services (' + localId + '): ' + response.error });
});

router.get('/get_service', authenticateToken, async(req, res) => {
    const { localId } = req.localId;
    const id = req.query.id;

    const response = await getServiceById(localId, id);

    if(response.success)
        return res.status(200).json({ servicesData: response.serviceData })
    else
        return res.status(500).json({ error: '/get_service (' + localId + '): ' + response.error });
});

router.post('/set_service', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const serviceData = req.body.serviceData ?? req.body.servicesData;

    if (!hasRequiredDuration(serviceData)) {
        return res.status(400).json({
            code: 4001,
            error: `El parámetro serviceData.duration_minutes debe ser exactamente ${REQUIRED_DURATION_MINUTES}.`
        });
    }

    const response = await setService(localId, serviceData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/update_service', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const serviceData = req.body.serviceData ?? req.body.servicesData;

    if (!hasRequiredDuration(serviceData)) {
        return res.status(400).json({
            code: 4001,
            error: `El parámetro serviceData.duration_minutes debe ser exactamente ${REQUIRED_DURATION_MINUTES}.`
        });
    }

    const response = await updateService(localId, serviceData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error });
});

router.post('/delete_services', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { servicesData } = req.body;

    const response = await deleteServices(localId, servicesData);

    if(response.success)
        return res.status(200).json({ message: 'Created' });
    else
        return res.status(500).json({ code: response.code, error: response.error, deleted: response.deleted, skipped: response.skipped });
});

module.exports = router;
