const express = require('express');
const { authenticateAgentToken } = require('../../config/MID_JWTManagement')
const { 
    getServices
} = require('../../repositories/DAO_Services')

const router = express.Router();


router.get('/get_services_names', authenticateAgentToken, async(req, res) => {
    const { localId } = req.localId;

    const response = await getServices(localId);
    if(!response.success)
        return res.status(500).json({ error: '/agent/get_services_names (' + localId + '): ' + response.error });
    if(response.success && response.servicesData.length === 0)
        return res.status(500).json({ error: '/agent/get_services_names (' + localId + '): ' + 'No hay ningún servicio asociado a este local' });
    else{
        var servicesNamesList = response.servicesData.map(service => service.name);
        return res.status(200).json({ servicesData: servicesNamesList })
    }
});

module.exports = router;
