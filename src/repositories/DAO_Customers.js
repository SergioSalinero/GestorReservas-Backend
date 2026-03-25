const { getDbConnection } = require('../config/CON_DBConnection');
const { v4: uuidv4 } = require('uuid');
const { updatedCustomerReservations } = require('./DAO_Reservations');

async function setCustomer(localId, customerData) {
    const pool = getDbConnection();

    try {
        const query = `
            INSERT INTO customers (id, local_id, name, phone_number, num_reservations, num_cancelations, num_warnings, is_blocked, blocked_reason, blocked_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *;
        `;
        const values = [
            uuidv4(),
            localId,
            customerData.name,
            customerData.phone_number,
            customerData.num_reservations || null,
            customerData.num_cancelations || null,
            customerData.num_warnings || null,
            customerData.is_blocked || null,
            customerData.blocked_reason || null,
            customerData.blocked_at || null
        ];

        res = await pool.query(query, values);
        return { success: true, customerData: res.rows[0] || null };

    } catch (error) {
        console.error('setCustomer (check existing) (' + localId + '): ', error);

        if (error.code === '23505') {
            return { success: false, code: 2001, error: 'Número de teléfono ya existe.' };
        }

        return { success: false, error: error.message };
    }
}

async function updateCustomer(localId, customerData) {
    const pool = getDbConnection();

    const query = `
        UPDATE customers
        SET name = $1,
            phone_number = $2,
            num_reservations = $3,
            num_cancelations = $4,
            num_warnings = $5,
            is_blocked = $6,
            blocked_reason = $7,
            blocked_at = $8,
            updated_at = NOW()
        WHERE local_id = $9 AND id = $10
        RETURNING *;
    `;
    const values = [
        customerData.name,
        customerData.phone_number,
        customerData.num_reservations || null,
        customerData.num_cancelations || null,
        customerData.num_warnings || null,
        customerData.is_blocked || null,
        customerData.blocked_reason || null,
        customerData.blocked_at || null,
        localId,
        customerData.id
    ];

    try {
        const res = await pool.query(query, values);

        // Actualizar las reservas asociadas al cliente
        response = await updatedCustomerReservations(localId, customerData);
        if (!response.success) {
            return { success: false, error: error.message };
        }

        return { success: true, customerData: res.rows[0] || null };
    } catch (error) {
        console.error('updateCustomer (' + localId + '): ', error);

        if (error.code === '23505') {
            return { success: false, code: 2001, error: 'Número de teléfono ya existe.' };
        }

        return { success: false, error: error.message };
    }
}

async function getCustomers(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM customers WHERE local_id = $1;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, customersData: res.rows || null };
    } catch (error) {
        console.error('getCustomer (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getCustomerById(localId, id) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM customers WHERE local_id = $1 AND id = $2;
    `;

    try {  
        const res = await pool.query(query, [localId, id]);
        return { success: true, customersData: res.rows[0] || null };
    } catch (error) {
        console.error('getCustomerById (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function deleteCustomers(localId, customerData) {
    const pool = getDbConnection();

    // Verificar si el cliente tiene reservas confirmadas
    const checkQuery = `
        SELECT COUNT(*) as count
        FROM reservations
        WHERE local_id = $1 AND 
        phone_number = $2 AND 
        status = 'confirmed';
    `;

    const deleteQuery = `
        DELETE FROM customers
        WHERE local_id = $1 and id = $2;
    `;

    try {
        const deletedCustomers = [];
        const skippedCustomers = [];

        for (const customer of customerData) {
            // Verificar si tiene reservas confirmadas
            const checkRes = await pool.query(checkQuery, [localId, customer.phone_number]);
            const confirmedReservationsCount = parseInt(checkRes.rows[0].count);

            if (confirmedReservationsCount > 0) {
                skippedCustomers.push({
                    id: customer.id,
                    name: customer.name,
                    phone_number: customer.phone_number,
                    reason: 'Tiene reservas confirmadas'
                });
                continue;
            }

            // Si no tiene reservas confirmadas, eliminar
            await pool.query(deleteQuery, [localId, customer.id]);
            deletedCustomers.push(customer.id);
        }

        if (skippedCustomers.length > 0) {
            var message = `\nNo se pueden eliminar los siguientes clientes porque tienen reservas confirmadas:\n`;
            skippedCustomers.forEach(c => {
                message += `- ${c.name} (${c.phone_number})\n`;
            });
        }


        if (skippedCustomers.length > 0) {
            return { 
                success: false, 
                code: 2004,
                error: message,
                deleted: deletedCustomers,
                skipped: skippedCustomers
            };
        }

        return { success: true, message: 'Customers deleted', deleted: deletedCustomers };
    } catch (error) {
        console.error('deleteCustomers (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getCustomerByPhoneNumber(localId, phoneNumber) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM customers WHERE local_id = $1 AND phone_number = $2;
    `;

    try {
        const res = await pool.query(query, [localId, phoneNumber]);
        return { success: true, customerData: res.rows || null };
    } catch (error) {
        console.error('getCustomerByPhoneNumber (' + localId + '): ', error);
        return { success: false, code: mappedError.code, error: mappedError.message };
    }
}

async function updateCustomerReservationsCountByPhoneNumber(localId, phoneNumber) {
    const pool = getDbConnection();

    const query = `
        UPDATE customers
        SET num_reservations = COALESCE(num_reservations, 0) + 1,
            updated_at = NOW()
        WHERE local_id = $1 AND phone_number = $2
        RETURNING *;
    `;

    try {
        const res = await pool.query(query, [localId, phoneNumber]);
        return { success: true, customerData: res.rows[0] || null };
    } catch (error) {
        console.error('updateCustomerReservationsCountByPhoneNumber (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function isCustomerBlocked(localId, phoneNumber) {
    const pool = getDbConnection();

    const query = `
        SELECT is_blocked FROM customers WHERE local_id = $1 AND phone_number = $2;
    `;
    try {
        const res = await pool.query(query, [localId, phoneNumber]);
        if (res.rows.length === 0) {
            return { success: true, is_blocked: false };
        }
        return { success: true, is_blocked: res.rows[0].is_blocked };
    } catch (error) {
        console.error('isCustomerBlocked (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    setCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomers,
    getCustomerByPhoneNumber,
    updateCustomerReservationsCountByPhoneNumber,
    isCustomerBlocked
}