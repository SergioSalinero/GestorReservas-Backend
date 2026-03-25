const { getDbConnection } = require('../config/CON_DBConnection');
require('dotenv').config();

const CRYPT_SECRET_KEY = process.env.CRYPT_SECRET_KEY;

async function getOpenRouterKeyByLocalId(localId) {
    const pool = getDbConnection();

    if (!CRYPT_SECRET_KEY)
        return { success: false, error: 'CRYPT_SECRET_KEY no está configurada en el entorno.' };

    const query = `
        SELECT
            pgp_sym_decrypt(openrouter_key, $2) AS key
        FROM locals
        WHERE id = $1
            AND openrouter_key_status = 'ready';
    `;

    try {
        const res = await pool.query(query, [localId, CRYPT_SECRET_KEY]);
        return { success: true, openRouterData: res.rows || [] };
    } catch (error) {
        console.error('getOpenRouterKeyByLocalId (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function setOpenRouterKeyByLocalId(localId, openRouterKey) {
    const pool = getDbConnection();

    if (!CRYPT_SECRET_KEY)
        return { success: false, error: 'CRYPT_SECRET_KEY no está configurada en el entorno.' };

    const query = `
        UPDATE locals
        SET openrouter_key = pgp_sym_encrypt($2, $3), openrouter_key_status = 'ready', updated_at = NOW()
        WHERE id = $1;
    `;

    try {
        const res = await pool.query(query, [localId, openRouterKey, CRYPT_SECRET_KEY]);

        if (res.rowCount === 0)
            return { success: false, error: 'No se ha encontrado el local para guardar la openrouter_key.' };

        return { success: true };
    } catch (error) {
        console.error('setOpenRouterKeyByLocalId (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    getOpenRouterKeyByLocalId,
    setOpenRouterKeyByLocalId
};
