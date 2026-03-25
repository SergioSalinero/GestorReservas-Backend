const { getDbConnection } = require('../config/CON_DBConnection');
const { v4: uuidv4 } = require('uuid');
const { updateEmployeeCount } = require('./DAO_LocalData');
const { updatedEmployeeReservations } = require('./DAO_Reservations');


async function setEmployees(localId, employeesData) {
    const pool = getDbConnection();

    try {
        for (const employees of employeesData) {
            const id = uuidv4();

            await pool.query(
                `
                INSERT INTO employees
                (id, local_id, name, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW());
                `,
                [
                    id,
                    localId,
                    employees.name,
                    employees.is_active
                ]
            );
        }

        // Actualizar el contador de empleados en el local
        var response = await updateEmployeeCount(localId);
        if (!response.success) {
            return { success: false, error: error.message };
        }

        return { success: true, message: 'Employees saved' };
    } catch (error) {
        console.error('setEmployees (' + localId + '): ', error);

        if (error.code === '23505') {
            return { success: false, code: 4001, error: 'Nombre del empleado ya existe.' };
        }

        return { success: false, error: error.message };
    }
}

async function getEmployees(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM employees WHERE local_id = $1 AND is_active = TRUE;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, employeesData: res.rows || null };
    } catch (error) {
        console.error('getEmployees (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getEmployeeById(localId, id) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM employees WHERE local_id = $1 AND id = $2;
    `;

    try {
        const res = await pool.query(query, [localId, id]);
        return { success: true, employeeData: res.rows[0] || null };
    } catch (error) {
        console.error('getEmployeeById (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getEmployeeByName(localId, name) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM employees WHERE local_id = $1 AND name = $2 AND is_active = true;
    `;

    try {
        const res = await pool.query(query, [localId, name]);
        return { success: true, employeeData: res.rows[0] || null };
    } catch (error) {
        console.error('getEmployeeByName (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getActivatedEmployees(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM employees WHERE local_id = $1 AND is_active = true;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, employeesData: res.rows || null };
    } catch (error) {
        console.error('getActivatedEmployees (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function setEmployee(localId, employeesData) {
    const pool = getDbConnection();

    try {
        const id = uuidv4();

        await pool.query(
            `
            INSERT INTO employees
            (id, local_id, name, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW());
            `,
            [
                id,
                localId,
                employeesData.name,
                employeesData.is_active
            ]
        );

        // Actualizar el contador de empleados en el local
        var response = await updateEmployeeCount(localId);
        if (!response.success) {
            return { success: false, error: error.message };
        }
        
        return { success: true, message: 'Employee saved' };
    } catch (error) {
        console.error('setEmployee (' + localId + '): ', error);

        if (error.code === '23505') {
            return { success: false, code: 4001, error: 'Nombre del empleado ya existe.' };
        }

        return { success: false, error: error.message };
    }
}

async function updateEmployee(localId, employeesData) {
    const pool = getDbConnection();

    try {
        await pool.query(
            `
            UPDATE employees
            SET name = $1,
                is_active = $2,
                updated_at = NOW()
            WHERE local_id = $3 AND id = $4;
            `,
            [
                employeesData.name,
                employeesData.is_active,
                localId,
                employeesData.id
            ]
        );


        // Actualizar el contador de empleados en el local
        var response = await updateEmployeeCount(localId);
        if (!response.success) {
            return { success: false, error: error.message };
        }

        // Actualizar las reservas asociadas al empleado
        response = await updatedEmployeeReservations(localId, employeesData);
        if (!response.success) {
            return { success: false, error: error.message };
        }


        return { success: true, message: 'Employee updated' };
    } catch (error) {
        console.error('updateEmployee (' + localId + '): ', error);

        if (error.code === '23505') {
            return { success: false, code: 4001, error: 'Nombre del empleado ya existe.' };
        }

        return { success: false, error: error.message };
    }
}

async function deleteEmployees(localId, employeesData) {
    const pool = getDbConnection();

    // Verificar si el empleado tiene reservas confirmadas
    const checkQuery = `
        SELECT COUNT(*) as count
        FROM reservations
        WHERE local_id = $1 AND employee_id = $2 AND status = 'confirmed';
    `;

    const deleteQuery = `
        DELETE FROM employees
        WHERE local_id = $1 AND id = $2
        RETURNING *;
    `;

    try {
        const deletedEmployees = [];
        const skippedEmployees = [];

        for (const employee of employeesData) {
            // Verificar si tiene reservas confirmadas
            const checkRes = await pool.query(checkQuery, [localId, employee.id]);
            const confirmedReservationsCount = parseInt(checkRes.rows[0].count);

            if (confirmedReservationsCount > 0) {
                skippedEmployees.push({
                    id: employee.id,
                    name: employee.name,
                    reason: 'Tiene reservas confirmadas'
                });
                continue;
            }

            // Si no tiene reservas confirmadas, eliminar
            const res = await pool.query(deleteQuery, [localId, employee.id]);

            if (res.rowCount === 0) {
                skippedEmployees.push({
                    id: employee.id,
                    name: employee.name,
                    reason: 'No encontrado'
                });
                continue;
            }

            deletedEmployees.push(employee.id);
        }

        if (skippedEmployees.length > 0) {
            return {
                success: false,
                error: `No se pueden eliminar los empleados porque tienen reservas confirmadas.`,
                deleted: deletedEmployees,
                skipped: skippedEmployees
            };
        }

        // Actualizar el contador de empleados en el local si se eliminó al menos uno
        if (deletedEmployees.length > 0) {
            var response = await updateEmployeeCount(localId);
            if (!response.success) {
                return { success: false, error: error.message };
            }
        }

        return { success: true, message: 'Employees deleted', deleted: deletedEmployees, skipped: skippedEmployees };
    } catch (error) {
        console.error('deleteEmployees (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    setEmployees,
    getEmployees,
    getEmployeeById,
    getEmployeeByName,
    getActivatedEmployees,
    setEmployee,
    updateEmployee,
    deleteEmployees
}