const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

async function createOpenRouterApiKey(localId) {
    if (!OPENROUTER_API_KEY)
        return { success: false, error: 'OPENROUTER_API_KEY no está configurada en el entorno.' };

    const keyName = String(localId);

    try {
        const response = await axios.post(
            `${OPENROUTER_BASE_URL}/keys`,
            { name: keyName },
            {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        const key = response.data?.key || response.data?.data?.key || null;

        if (!key)
            return { success: false, error: 'OpenRouter devolvió una respuesta sin key utilizable.' };

        return { success: true, key };
    } catch (error) {
        const status = error.response?.status || 500;
        const apiError = error.response?.data || error.message;
        return { success: false, status, error: typeof apiError === 'string' ? apiError : JSON.stringify(apiError) };
    }
}

module.exports = {
    createOpenRouterApiKey
};