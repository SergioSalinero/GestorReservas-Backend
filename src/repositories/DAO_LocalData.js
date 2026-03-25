const { getDbConnection } = require('../config/CON_DBConnection');


async function getLocalName(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM locals WHERE id = $1;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, localName: res.rows[0]?.name || null };
    } catch (error) {
        console.error('getLocalName (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function setLocalData(localId, localData) {
    const pool = getDbConnection();

    const query = `
        UPDATE locals
        SET name = $1, phone_number = $2, address = $3, num_employees = $4, is_service_active = $5, updated_at = NOW()
        WHERE id = $6;
    `;

    try {
        const res = await pool.query(query, [localData.name, localData.phone_number, localData.address, localData.num_employees, localData.is_service_active, localId]);
        return { success: true };
    } catch (error) {
        console.error('setLocalData (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function getLocalData(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT id, username, name, phone_number, address, num_employees, is_service_active, created_at, updated_at
        FROM locals
        WHERE id = $1;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, localData: res.rows[0] || null };
    } catch (error) {
        console.error('getLocalData (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function updateEmployeeCount(localId) {
    const pool = getDbConnection();

    const query = `
        UPDATE locals
        SET num_employees = (SELECT COUNT(*) FROM employees WHERE local_id = $1),
            updated_at = NOW()
        WHERE id = $1;
    `;

    try {
        await pool.query(query, [localId]);
        return { success: true };
    } catch (error) {
        console.error('updateEmployeeCount (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function getLocalIdByLocalPhoneNumber(phoneNumber) {
    const pool = getDbConnection();
    const normalizedPhoneNumber = String(phoneNumber ?? '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/^\+/, '');

    const query = `
        SELECT id FROM locals WHERE phone_number = $1;
    `;

    if (!normalizedPhoneNumber)
        return { success: false, status: 400, invalidInput: true, error: 'local_phone_number es obligatorio.' };

    if (!/^\d+$/.test(normalizedPhoneNumber))
        return { success: false, status: 400, invalidInput: true, error: 'local_phone_number debe ser un número entero positivo.' };

    try {
        const res = await pool.query(query, [normalizedPhoneNumber]);
        return { success: true, localData: res.rows || null };
    } catch (error) {
        console.error('getLocalIdByCustumerPhoneNumber: ', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    getLocalName,
    getLocalData,
    setLocalData,
    updateEmployeeCount,
    getLocalIdByLocalPhoneNumber
}
