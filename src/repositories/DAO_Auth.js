const { getDbConnection } = require('../config/CON_DBConnection');
const { v4: uuidv4 } = require('uuid');

async function findUserByUsername(username) {
    const pool = getDbConnection();
    const res = await pool.query('SELECT * FROM locals WHERE username = $1', [username]);
    return res.rows[0] || null;
}


async function createUser(username, passwordHash, company, passwordRecoveryHash) {
    const localId = uuidv4();
    const pool = getDbConnection();

    const query = `
        INSERT INTO locals (id, username, password, password_recovery_code, name, phone_number, address, num_employees, is_service_active, openrouter_key, openrouter_key_status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, 'pending', NOW())
    `;

    try {
        await pool.query(query, [localId, username, passwordHash, passwordRecoveryHash, company.name, company.phone_number, company.address, company.num_employees, company.is_service_active]);
        return { success: true, localId };
    } catch (error) {
        console.error('createUser (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function deleteUser(localId) {
    const pool = getDbConnection();

    const query = `
        DELETE FROM locals WHERE id = $1
    `;

    try {
        await pool.query(query, [localId]);
        return { success: true };
    } catch (error) {
        console.error('deleteUser (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function setNewPassword(localId, newPasswordHash) {
    const pool = getDbConnection();

    const query = `
        UPDATE locals SET password = $1, updated_at = NOW() WHERE id = $2
    `;

    try {
        await pool.query(query, [newPasswordHash, localId]);
        return { success: true };
    } catch (error) {
        console.error('setNewPassword (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}


module.exports = {
    findUserByUsername,
    createUser,
    deleteUser,
    setNewPassword
}
