const express = require('express');
const { 
    authenticateAgentToken,
    authenticateStaticToken
 } = require('../../config/MID_JWTManagement');
const { 
    deleteAgentMemory,
    deleteAgentMemorybySessionId
} = require('../../repositories/DAO_Agent');
const {
    getLocalData
} = require('../../repositories/DAO_LocalData');

const router = express.Router("/agent");


router.post('/delete_agent_memory', authenticateStaticToken, async (req, res) => {
    var response = await deleteAgentMemory();

    if(response.success)
        return res.status(200).json({ output: "Memoria de agentes eliminada correctamente." });
    else
        return res.status(500).json({ output: "Error al eliminar la memoria de agentes: " + response.error });
});

router.post('/delete_agent_memory_by_session', authenticateAgentToken, async (req, res) => {
    const { customer_phone_number } = req.body;
    const { localId } = req.localId;

    if (!customer_phone_number)
        return res.status(400).json({ output: "customer_phone_number es obligatorio." });

    const localResponse = await getLocalData(localId);
    if (!localResponse.success)
        return res.status(500).json({ output: "Error al obtener los datos del local autenticado: " + localResponse.error });
    if (!localResponse.localData?.phone_number)
        return res.status(404).json({ output: "No se ha encontrado phone_number para el local autenticado." });

    const sessionId = localResponse.localData.phone_number + '' + customer_phone_number;
    const response = await deleteAgentMemorybySessionId(sessionId);

    if (response.success)
        return res.status(200).json({ output: "Memoria del agente eliminada correctamente.", sessionId });
    else
        return res.status(500).json({ output: "Error al eliminar la memoria del agente: " + response.error });
});


module.exports = router;
