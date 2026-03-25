const { getDbConnection } = require('../config/CON_DBConnection');
const { v4: uuidv4 } = require('uuid');
const { updatedServiceReservations } = require('./DAO_Reservations');


async function setServices(localId, servicesData) {
    const pool = getDbConnection();

    try {
        for (const service of servicesData) {
            const id = uuidv4();

            await pool.query(
                `
                INSERT INTO services
                (id, local_id, name, description, duration_minutes, price, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
                `,
                [
                    id,
                    localId,
                    service.name,
                    service.description || null,
                    service.duration_minutes,
                    service.price,
                    service.is_active
                ]
            );
        }

        return { success: true, message: 'Services saved' };
    } catch (error) {
        console.error('setServices (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getServices(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM services WHERE local_id = $1 AND is_active = TRUE;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, servicesData: res.rows || null };
    } catch (error) {
        console.error('getServices (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getServiceById(localId, id) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM services WHERE local_id = $1 AND id = $2;
    `;

    try {
        const res = await pool.query(query, [localId, id]);
        return { success: true, serviceData: res.rows[0] || null };
    } catch (error) {
        console.error('getServiceById (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function setService(localId, serviceData) {
    const pool = getDbConnection();

    const query = `
        INSERT INTO services (id, local_id, name, description, duration_minutes, price, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
    `;
    const values = [
        uuidv4(),
        localId,
        serviceData.name,
        serviceData.description || null,
        serviceData.duration_minutes,
        serviceData.price,
        serviceData.is_active
    ];

    try {
        const res = await pool.query(query, values);
        return { success: true, serviceData: res.rows[0] || null };
    } catch (error) {
        console.error('setService (' + localId + '): ', error);
        
        if (error.code === '23505') {
            return { success: false, code: 3001, error: 'Nombre del servicio ya existe.' };
        }

        return { success: false, error: error.message };
    }
}

async function getServiceByName(localId, name) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM services WHERE local_id = $1 AND name = $2;
    `;

    try {
        const res = await pool.query(query, [localId, name]);
        return { success: true, serviceData: res.rows[0] || null };
    } catch (error) {
        console.error('getServiceByName (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function updateService(localId, serviceData) {
    const pool = getDbConnection();

    const query = `
        UPDATE services
        SET name = $1,
            description = $2,
            duration_minutes = $3,
            price = $4,
            is_active = $5,
            updated_at = NOW()
        WHERE local_id = $6 AND id = $7
        RETURNING *;
    `;
    const values = [
        serviceData.name,
        serviceData.description || null,
        serviceData.duration_minutes,
        serviceData.price,
        serviceData.is_active,
        localId,
        serviceData.id
    ];

    try {
        const res = await pool.query(query, values);

        // Actualizar las reservas asociadas al servicio
        response = await updatedServiceReservations(localId, serviceData);
        if (!response.success) {
            return { success: false, error: error.message };
        }

        return { success: true, serviceData: res.rows[0] || null };
    } catch (error) {
        console.error('updateService (' + localId + '): ', error);
        
        if (error.code === '23505') {
            return { success: false, code: 3001, error: 'Nombre del servicio ya existe.' };
        }

        return { success: false, error: error.message };
    }
}

async function deleteServices(localId, servicesData) {
    const pool = getDbConnection();

    // Verificar si el servicio tiene reservas confirmadas
    const checkQuery = `
        SELECT COUNT(*) as count
        FROM reservations
        WHERE local_id = $1 AND service_id = $2 AND status = 'confirmed';
    `;

    const deleteQuery = `
        DELETE FROM services
        WHERE local_id = $1 AND id = $2
        RETURNING *;
    `;

    try {
        const deletedServices = [];
        const skippedServices = [];

        for (const service of servicesData) {
            // Verificar si tiene reservas confirmadas
            const checkRes = await pool.query(checkQuery, [localId, service.id]);
            const confirmedReservationsCount = parseInt(checkRes.rows[0].count);

            if (confirmedReservationsCount > 0) {
                skippedServices.push({
                    id: service.id,
                    name: service.name,
                    reason: 'Tiene reservas confirmadas'
                });
                continue;
            }

            // Si no tiene reservas confirmadas, eliminar
            const res = await pool.query(deleteQuery, [localId, service.id]);

            if (res.rowCount === 0) {
                skippedServices.push({
                    id: service.id,
                    name: service.name,
                    reason: 'No encontrado'
                });
                continue;
            }

            deletedServices.push(service.id);
        }

        if (skippedServices.length > 0) {
            return { 
                success: false, 
                error: `No se pueden eliminar los servicios porque tienen reservas confirmadas.`,
                deleted: deletedServices,
                skipped: skippedServices
            };
        }

        return { success: true, message: 'Services deleted', deleted: deletedServices, skipped: skippedServices };
    } catch (error) {
        console.error('deleteServices (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    setServices,
    getServices,
    getServiceById,
    setService,
    getServiceByName,
    updateService,
    deleteServices
}