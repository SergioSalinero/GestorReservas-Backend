const { getDbConnection } = require('../config/CON_DBConnection');
const { v4: uuidv4 } = require('uuid');

async function setReservation(reservationData) {
    const pool = getDbConnection();

    const query = `
        INSERT INTO reservations (id, local_id, customer_id, service_id, employee_id, name, phone_number, service_name, employee_name, initial_datetime, final_datetime, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW());
    `;
    const values = [
        uuidv4(),
        reservationData.local_id,
        reservationData.customer_id,
        reservationData.service_id,
        reservationData.employee_id,
        reservationData.name,
        reservationData.phone_number,
        reservationData.service_name,
        reservationData.employee_name,
        reservationData.initial_datetime,
        reservationData.final_datetime,
        reservationData.status
    ];
    try {
        await pool.query(query, values);
        return { success: true, message: 'Created' };
    } catch (error) {
        console.error('setReservation (' + reservationData.local_id + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getReservationsOrderedByDate(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM reservations WHERE local_id = $1 ORDER BY initial_datetime ASC;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, reservationsData: res.rows || null };
    } catch (error) {
        console.error('getReservationsOrderedByDate: ', error);
        return { success: false, error: error.message };
    }
}

async function updateReservation(reservationData) {
    const pool = getDbConnection();

    const query = `
        UPDATE reservations
        SET customer_id = $1,
            service_id = $2,
            employee_id = $3,
            name = $4,
            phone_number = $5,
            service_name = $6,
            employee_name = $7,
            initial_datetime = $8,
            final_datetime = $9,
            updated_at = NOW()
        WHERE id = $10
          AND local_id = $11
          AND status = 'confirmed';
    `;
    const values = [
        reservationData.customer_id,
        reservationData.service_id,
        reservationData.employee_id,
        reservationData.name,
        reservationData.phone_number,
        reservationData.service_name,
        reservationData.employee_name,
        reservationData.initial_datetime,
        reservationData.final_datetime,
        reservationData.id,
        reservationData.local_id
    ];
    try {
        const res = await pool.query(query, values);
        const modified = res.rowCount > 0;

        return {
            success: true,
            modified,
            message: modified ? 'Updated' : 'Not modified'
        };
    } catch (error) {
        console.error('updateReservation (' + reservationData.local_id + '): ', error);
        return { success: false, error: error.message };
    }
}

async function cancelReservations(localId, reservationsData) {
    const pool = getDbConnection();

    const query = `
        UPDATE reservations
        SET status = 'cancelled', updated_at = NOW()
        WHERE local_id = $1 and id = $2;
    `;

    try {
        for (const reservationData of reservationsData) {
            const res = await pool.query(query, [localId, reservationData.id]);
        }
        return { success: true, messages: 'Reservations cancelled' };
    } catch (error) {
        console.error('cancelReservations (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function checkReservationCustomerConflict(localId, customer_phone_number, initial_datetime, final_datetime) {
    const pool = getDbConnection();

    const query = `
        SELECT *
        FROM reservations
        WHERE local_id = $1
          AND phone_number = $2
          AND status = 'confirmed'
          AND (
                (initial_datetime < $4 AND final_datetime > $3)
              );
    `;

    try {
        const res = await pool.query(query, [localId, customer_phone_number, initial_datetime, final_datetime]);
        return { success: true, reservationsData: res.rows || null };
    } catch (error) {
        console.error('checkReservationCustomerConflict (' + localId + ', ' + customer_phone_number + ', ' + initial_datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getReservationsByEmployeeAndDatetime(employeeId, initial_datetime, final_datetime) {
    const pool = getDbConnection();

    const query = `
        SELECT *
        FROM reservations
        WHERE employee_id = $1
          AND status = 'confirmed'
          AND (
                (initial_datetime < $3 AND final_datetime > $2)
          );
    `;

    try {
        const res = await pool.query(query, [employeeId, initial_datetime, final_datetime]);
        return { success: true, reservationsData: res.rows || null };
    } catch (error) {
        console.error('getReservationsByEmployeeAndDatetime (' + employeeId + ', ' + initial_datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getNumberOfReservationsByEmployeeAndDate(employeeId, initial_datetime) {
    const pool = getDbConnection();

    const query = `
        SELECT COUNT(*) FROM reservations WHERE employee_id = $1 AND DATE(initial_datetime) = DATE($2) AND status = 'confirmed';
    `;

    try {
        const res = await pool.query(query, [employeeId, initial_datetime]);
        return { success: true, numberOfReservations: parseInt(res.rows[0].count) || 0 };
    } catch (error) {
        console.error('getNumberOfReservationsByEmployeeAndDate (' + employeeId + ', ' + initial_datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function checkReservationCustomerConflictExcludeReservation(localId, reservationId, phoneNumber, initial_datetime, final_datetime) {
    const pool = getDbConnection();

    const query = `
        SELECT * 
        FROM reservations 
        WHERE local_id = $1 
            AND id <> $2 
            AND phone_number = $3 
            AND status = 'confirmed'
            AND (
                (initial_datetime < $5 AND final_datetime > $4)
            );
    `;

    try {
        const res = await pool.query(query, [localId, reservationId, phoneNumber, initial_datetime, final_datetime]);
        return { success: true, reservationsData: res.rows || null };
    } catch (error) {
        console.error('checkReservationCustomerConflict (' + localId + ', ' + phoneNumber + ', ' + initial_datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getReservationsByEmployeeAndDatetimeExcludeReservation(reservationId, employeeId, initial_datetime, final_datetime) {
    const pool = getDbConnection();

    const query = `
        SELECT * 
        FROM reservations 
        WHERE id <> $1 
            AND employee_id = $2 
            AND status = 'confirmed'
            AND (
                initial_datetime < $4 AND final_datetime > $3 
            );
    `; 

    try {
        const res = await pool.query(query, [reservationId, employeeId, initial_datetime, final_datetime]);
        return { success: true, reservationsData: res.rows || null };
    } catch (error) {
        console.error('getReservationsByEmployeeAndDatetime (' + employeeId + ', ' + initial_datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getNumberOfReservationsByEmployeeAndDateExcludeReservation(reservationId, employeeId, datetime) {
    const pool = getDbConnection();

    const query = `
        SELECT COUNT(*) FROM reservations WHERE id <> $1 AND employee_id = $2 AND DATE(initial_datetime) = DATE($3) AND status = 'confirmed';
    `; // Meter por si acaso WHERE local_id

    try {
        const res = await pool.query(query, [reservationId, employeeId, datetime]);
        return { success: true, numberOfReservations: parseInt(res.rows[0].count) || 0 };
    } catch (error) {
        console.error('getNumberOfReservationsByEmployeeAndDate (' + employeeId + ', ' + datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getReservationIdByCustomerNumberAndDatetime(localId, customer_phone_number, datetime){
    const pool = getDbConnection();
    
    const query = `
        SELECT id
        FROM reservations
        WHERE local_id = $1
          AND phone_number = $2
          AND initial_datetime = $3
          AND status = 'confirmed';
    `;

    try {
        const res = await pool.query(query, [localId, customer_phone_number, datetime]);
        return { success: true, reservationData: res.rows || null };
    } catch (error) {
        console.error('getReservationIdByCustomerNumberAndDatetime (' + customer_phone_number + ', ' + datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getReservationsByCustomerId(localId, customerId) {
    const pool = getDbConnection();

    const query = `
        SELECT *
        FROM reservations
        WHERE local_id = $1
          AND customer_id = $2
          AND status = 'confirmed'
        ORDER BY initial_datetime ASC;
    `;

    try {
        const res = await pool.query(query, [localId, customerId]);
        return { success: true, reservationsData: res.rows || null };
    } catch (error) {
        console.error('getReservationsByCustomerId (' + localId + ', ' + customerId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getReservationsByEmployeeAndDate(localId, employeeId, datetime) {
    const pool = getDbConnection();

    const query = `
        SELECT *
        FROM reservations
        WHERE local_id = $1
          AND employee_id = $2
          AND status = 'confirmed'
          AND final_datetime > DATE($3)
          AND initial_datetime < (DATE($3) + INTERVAL '1 day')
    `;

    try {
        const res = await pool.query(query, [localId, employeeId, datetime]);
        return { success: true, reservationsData: res.rows || null };
    } catch (error) {
        console.error('getReservationsByEmployeeAndDate (' + employeeId + ', ' + initial_datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getReservationById(id) {
    const pool = getDbConnection();

    const query = `
        SELECT *
        FROM reservations
        WHERE id = $1
    `;

    try {
        const res = await pool.query(query, [id]);
        return { success: true, reservationData: res.rows || null };
    } catch (error) {
        console.error('getReservationsByEmployeeAndDate (' + employeeId + ', ' + initial_datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function updatedEmployeeReservations(localId, employeesData) {
    const pool = getDbConnection();

    const query = `
        UPDATE reservations
        SET employee_name = $1,
            updated_at = NOW()
        WHERE local_id = $2 AND employee_id = $3;
    `;

    try {
        const res = await pool.query(query, [employeesData.name, localId, employeesData.id]);

        return { success: true, messages: 'Reservations updated' };
    } catch (error) {
        console.error('updatedEmployeeReservations (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function updatedServiceReservations(localId, servicesData) {
    const pool = getDbConnection();

    const query = `
        UPDATE reservations
        SET service_name = $1,
            updated_at = NOW()
        WHERE local_id = $2 AND service_id = $3;
    `;

    try {
        const res = await pool.query(query, [servicesData.name, localId, servicesData.id]);

        return { success: true, messages: 'Reservations updated' };
    } catch (error) {
        console.error('updatedServiceReservations (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function updatedCustomerReservations(localId, customersData) {
    const pool = getDbConnection();
    
    const query = `
        UPDATE reservations
        SET name = $1,
            phone_number = $2,
            updated_at = NOW()
        WHERE local_id = $3 AND customer_id = $4;
    `;

    try {
        const res = await pool.query(query, [customersData.name, customersData.phone_number, localId, customersData.id]);

        return { success: true, messages: 'Reservations updated' };
    } catch (error) {
        console.error('updatedCustomerReservations (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}

async function updateStatusReservations(){
    const pool = getDbConnection();

    const query = `
        UPDATE reservations
        SET status = 'completed'
        WHERE status = 'confirmed' AND final_datetime < NOW();
    `;

    try {
        const res = await pool.query(query);
        return { success: true, messages: 'Reservations status updated' };
    } catch (error) {
        console.error('updateStatusReservations:', error);
        return { success: false, error: error.message };
    }
}


module.exports = {
    setReservation,
    updateReservation,
    cancelReservations,
    checkReservationCustomerConflict,
    getReservationsByEmployeeAndDatetime,
    getNumberOfReservationsByEmployeeAndDate,
    getReservationsOrderedByDate,
    checkReservationCustomerConflictExcludeReservation,
    getReservationsByEmployeeAndDatetimeExcludeReservation,
    getNumberOfReservationsByEmployeeAndDateExcludeReservation,
    getReservationIdByCustomerNumberAndDatetime,
    getReservationsByCustomerId,
    getReservationsByEmployeeAndDate,
    getReservationById,
    updatedEmployeeReservations,
    updatedServiceReservations,
    updatedCustomerReservations,
    updateStatusReservations
}
