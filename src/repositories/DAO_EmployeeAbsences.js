const { getDbConnection } = require('../config/CON_DBConnection');
const { v4: uuidv4 } = require('uuid');

async function setEmployeeAbsences(localId, employeeAbsencesData) {
    const pool = getDbConnection();

    try {
        for (const employeeAbsence of employeeAbsencesData) {
            const query = `DELETE FROM employee_absences WHERE employee_id = $1;`;
            await pool.query(query, [employeeAbsence.employee_id]);
        }

        for (const employeeAbsence of employeeAbsencesData) {
            const id = uuidv4();

            await pool.query(
                `
                INSERT INTO employee_absences
                (id, local_id, employee_id, initial_datetime, final_datetime, reason, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW());
                `,
                [
                    id,
                    localId,
                    employeeAbsence.employee_id,
                    employeeAbsence.initial_datetime,
                    employeeAbsence.final_datetime,
                    employeeAbsence.reason
                ]
            );
        }

        return { success: true, message: 'Employee abcenses saved' };
    } catch (error) {
        console.error('setEmployeeAbcenses (' + employeeAbsencesData[0].employee_id + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getEmployeeAbsences(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM employee_absences WHERE local_id = $1 ORDER BY initial_datetime ASC;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, employeeAbsencesData: res.rows || null };
    } catch (error) {
        console.error('getEmployeeId (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getEmployeeAbsencesByDatetime(employeeId, datetime, finalDatetime) {
    const pool = getDbConnection();
    const query = `
       SELECT * FROM employee_absences WHERE employee_id = $1 AND ($2 BETWEEN initial_datetime AND final_datetime OR $3 BETWEEN initial_datetime AND final_datetime);
    `;
    try {
        const res = await pool.query(query, [employeeId, datetime, finalDatetime]);
        return { success: true, employeeAbsencesData: res.rows.length || 0 };
    } catch (error) {
        console.error('getEmployeeAbsencesByDatetime (' + employeeId + ', ' + datetime + '): ', error);
        return { success: false, error: error.message };
    }
}

async function setEmployeeAbsence(localId, employeeAbsenceData) {
    const pool = getDbConnection();

    try {
        const overlapQuery = `
            SELECT 1
            FROM employee_absences
            WHERE employee_id = $1
            AND (
                initial_datetime < $3
                AND $2 < final_datetime
            )
            LIMIT 1;
        `;

        const overlapResult = await pool.query(overlapQuery, [
            employeeAbsenceData.employee_id,
            employeeAbsenceData.initial_datetime,
            employeeAbsenceData.final_datetime
        ]);

        if (overlapResult.rowCount > 0) {
            return { success: false, code: 5001, error: 'El empleado ya tiene una ausencia en ese rango de fechas.' };
        }


        const id = uuidv4();

        await pool.query(
            `
            INSERT INTO employee_absences
            (id, local_id, employee_id, initial_datetime, final_datetime, reason, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
            `,
            [
                id,
                localId,
                employeeAbsenceData.employee_id,
                employeeAbsenceData.initial_datetime,
                employeeAbsenceData.final_datetime,
                employeeAbsenceData.reason
            ]
        );

        return { success: true, message: 'Employee absence saved' };
    } catch (error) {
        console.error('setEmployeeAbsence (' + employeeAbsenceData.employee_id + '): ', error);
        return { success: false, error: error.message };
    }
}

async function updateEmployeeAbsence(localId, employeeAbsenceData) {
    const pool = getDbConnection();

    try {
        const overlapQuery = `
            SELECT 1
            FROM employee_absences
            WHERE employee_id = $1
                AND id != $4
                AND (
                   initial_datetime < $3
                    AND $2 < final_datetime
                )
            LIMIT 1;
        `;

        const overlapResult = await pool.query(overlapQuery, [
            employeeAbsenceData.employee_id,
            employeeAbsenceData.initial_datetime,
            employeeAbsenceData.final_datetime,
            employeeAbsenceData.id
        ]);

        if (overlapResult.rowCount > 0) {
            return { success: false, code: 5001, error: 'El empleado ya tiene una ausencia en ese rango de fechas.' };
        }

        await pool.query(
            `
            UPDATE employee_absences
            SET initial_datetime = $1,
                final_datetime = $2,
                reason = $3,
                updated_at = NOW()
            WHERE id = $4 AND employee_id = $5 AND local_id = $6;
            `,
            [
                employeeAbsenceData.initial_datetime,
                employeeAbsenceData.final_datetime,
                employeeAbsenceData.reason,
                employeeAbsenceData.id,
                employeeAbsenceData.employee_id,
                localId
            ]
        );

        return { success: true, message: 'Employee absence updated' };
    } catch (error) {
        console.error('updateEmployeeAbsence (' + employeeAbsenceData.employee_id + '): ', error);
        return { success: false, error: error.message };
    }
}

async function deleteEmployeeAbsence(localId, employeeAbsenceData) {
    const pool = getDbConnection();

    const query = `
            DELETE FROM employee_absences
            WHERE id = $1 AND local_id = $2;
            `;

    try {
        for (const empAbsenceData of employeeAbsenceData) {
            await pool.query(query, [empAbsenceData.id, localId]);
        }
        return { success: true, message: 'Employee absence deleted' };
    } catch (error) {
        console.error('deleteEmployeeAbsence (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    setEmployeeAbsences,
    getEmployeeAbsences,
    getEmployeeAbsencesByDatetime,
    setEmployeeAbsence,
    updateEmployeeAbsence,
    deleteEmployeeAbsence
}