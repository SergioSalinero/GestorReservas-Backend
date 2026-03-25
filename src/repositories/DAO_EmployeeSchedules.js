const { getDbConnection } = require('../config/CON_DBConnection');
const { v4: uuidv4 } = require('uuid');


// Time Blocks Management
async function getTimeBlocks(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM time_blocks WHERE local_id = $1;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, timeBlocksData: res.rows || null };
    } catch (error) {
        console.error('getTimeBlocks (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function setTimeBlock(localId, timeBlocksData) {
    const pool = getDbConnection();

    try {
        const id = uuidv4();

        const res = await pool.query(
            `
            INSERT INTO time_blocks
            (id, local_id, morning_opening_time, morning_closing_time, afternoon_opening_time, afternoon_closing_time, color, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING *;
            `,
            [
                id,
                localId,
                timeBlocksData.morning_opening_time,
                timeBlocksData.morning_closing_time,
                timeBlocksData.afternoon_opening_time,
                timeBlocksData.afternoon_closing_time,
                timeBlocksData.color
            ]
        );

        return { success: true, message: 'Time block saved', timeBlocksData: res.rows[0] };
    } catch (error) {
        console.error('setTimeBlock (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function updateTimeBlock(localId, timeBlocksData) {
    const pool = getDbConnection();

    try {
        await pool.query(
            `
            UPDATE time_blocks
            SET morning_opening_time = $1,
                morning_closing_time = $2,
                afternoon_opening_time = $3,
                afternoon_closing_time = $4,
                color = $5,
                updated_at = NOW()
            WHERE local_id = $6 AND id = $7;
            `,
            [
                timeBlocksData.morning_opening_time,
                timeBlocksData.morning_closing_time,
                timeBlocksData.afternoon_opening_time,
                timeBlocksData.afternoon_closing_time,
                timeBlocksData.color,
                localId,
                timeBlocksData.id
            ]
        );

        return { success: true, message: 'Time block updated' };
    } catch (error) {
        console.error('updateTimeBlock (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function deleteTimeBlock(localId, timeBlocksData) {
    const pool = getDbConnection();

    try {
        const res =await pool.query(
            `
            DELETE FROM time_blocks
            WHERE local_id = $1 AND id = $2
            RETURNING *;
            `,
            [
                localId,
                timeBlocksData.id
            ]
        );

        return { success: true, message: 'Time block deleted' };
    } catch (error) {
        console.error('deleteTimeBlock (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}


// Employee Schedules Management
async function getEmployeeSchedules(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM employee_schedules WHERE local_id = $1;
    `;
    
    try {
        const res = await pool.query(query, [localId]);
        return { success: true, employeeSchedulesData: res.rows || null };
    } catch (error) {
        console.error('getEmployeeSchedules (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getEmployeeSchedulesByEmployeeIdAndDate(localId, employeeId, date) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM employee_schedules WHERE local_id = $1 AND employee_id = $2 AND date = $3;
    `;

    try {
        const res = await pool.query(query, [localId, employeeId, date]);
        return { success: true, employeeSchedulesData: res.rows[0] || null };
    } catch (error) {
        console.error('getEmployeeSchedulesByEmployeeIdAndDate (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function setEmployeeSchedules(localId, schedulesData) {
    const pool = getDbConnection();

    try {
        for (const schedule of schedulesData) {
            await pool.query(`
                INSERT INTO employee_schedules
                (id, local_id, employee_id, date, time_block_id, morning_opening_time, morning_closing_time, afternoon_opening_time, afternoon_closing_time, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`
                ,
                [
                    uuidv4(),
                    localId,
                    schedule.employee_id,
                    schedule.date,
                    schedule.time_block_id,
                    schedule.morning_opening_time,
                    schedule.morning_closing_time,
                    schedule.afternoon_opening_time,
                    schedule.afternoon_closing_time
                ]
            );
        }

        return { success: true, message: 'Employee schedules set' };
    } catch (error) {
        console.error('setEmployeeSchedules (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}


async function setEmployeeSchedule(localId, employeeSchedulesData) {
    const pool = getDbConnection();

    try {
        const res = await pool.query(`
            INSERT INTO employee_schedules
            (id, local_id, employee_id, date, time_block_id, morning_opening_time, morning_closing_time, afternoon_opening_time, afternoon_closing_time, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *;
            `,
            [
                uuidv4(),
                localId,
                employeeSchedulesData.employee_id,
                employeeSchedulesData.date,
                employeeSchedulesData.time_block_id,
                employeeSchedulesData.morning_opening_time,
                employeeSchedulesData.morning_closing_time,
                employeeSchedulesData.afternoon_opening_time,
                employeeSchedulesData.afternoon_closing_time
            ]
        );

        return { success: true, message: 'Employee schedule set', employeeSchedulesData: res.rows[0] };
    } catch (error) {
        console.error('setEmployeeSchedule (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function updateEmployeeSchedule(localId, employeeSchedulesData) {
    const pool = getDbConnection();

    try {
        await pool.query(`
            UPDATE employee_schedules
            SET employee_id = $1,
                date = $2,
                time_block_id = $3,
                morning_opening_time = $4,
                morning_closing_time = $5,
                afternoon_opening_time = $6,
                afternoon_closing_time = $7,
                updated_at = NOW()
            WHERE local_id = $8 AND id = $9 RETURNING *;
            `,
            [
                employeeSchedulesData.employee_id,
                employeeSchedulesData.date,
                employeeSchedulesData.time_block_id,
                employeeSchedulesData.morning_opening_time,
                employeeSchedulesData.morning_closing_time,
                employeeSchedulesData.afternoon_opening_time,
                employeeSchedulesData.afternoon_closing_time,
                localId,
                employeeSchedulesData.id
            ]
        );

        return { success: true, message: 'Employee schedule updated' };
    } catch (error) {
        console.error('updateEmployeeSchedule (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function deleteEmployeeSchedule(localId, employeeSchedulesData) {
    const pool = getDbConnection();

    try {
        await pool.query(`
            DELETE FROM employee_schedules
            WHERE local_id = $1 AND id = $2;
            `,
            [
                localId,
                employeeSchedulesData.id
            ]
        );
        return { success: true, message: 'Employee schedule deleted' };
    } catch (error) {
        console.error('deleteEmployeeSchedule (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function copyWeekEmployeeSchedules(localId, employeeSchedulesData) {
    const pool = getDbConnection();

    newSchedulesData = [];
    for (const schedule of employeeSchedulesData) {
        try {
            var res =await pool.query(`
                SELECT id FROM employee_schedules
                WHERE local_id = $1 AND employee_id = $2 AND date = $3;
                `,
                [
                    localId,
                    schedule.employee_id,
                    schedule.date
                ]
            );

            if (res.rows.length === 0) {
                res = await pool.query(`
                    INSERT INTO employee_schedules
                    (id, local_id, employee_id, date, time_block_id, morning_opening_time, morning_closing_time, afternoon_opening_time, afternoon_closing_time, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                    RETURNING *;
                    `,
                    [
                        uuidv4(),
                        localId,
                        schedule.employee_id,
                        schedule.date,
                        schedule.time_block_id,
                        schedule.morning_opening_time,
                        schedule.morning_closing_time,
                        schedule.afternoon_opening_time,
                        schedule.afternoon_closing_time
                    ]
                );
            }
            else {
                res = await pool.query(`
                    UPDATE employee_schedules
                    SET time_block_id = $1,
                        morning_opening_time = $2,
                        morning_closing_time = $3,
                        afternoon_opening_time = $4,
                        afternoon_closing_time = $5,
                        updated_at = NOW()
                    WHERE local_id = $6 AND employee_id = $7 AND date = $8
                    RETURNING *;
                    `,
                    [
                        schedule.time_block_id,
                        schedule.morning_opening_time,
                        schedule.morning_closing_time,
                        schedule.afternoon_opening_time,
                        schedule.afternoon_closing_time,
                        localId,
                        schedule.employee_id,
                        schedule.date
                    ]
                );
            }

            newSchedulesData.push(res.rows[0]);
        } catch (error) {
            console.error('copyWeekEmployeeSchedules (' + localId + '): ', error);
            return { success: false, error: error.message };
        }
    }
    return { success: true, message: 'Week employee schedules copied', employeeSchedulesData: newSchedulesData };
}


module.exports = {
    setTimeBlock,
    getTimeBlocks,
    updateTimeBlock,
    deleteTimeBlock,
    getEmployeeSchedules,
    getEmployeeSchedulesByEmployeeIdAndDate,
    setEmployeeSchedules,
    setEmployeeSchedule,
    updateEmployeeSchedule,
    deleteEmployeeSchedule,
    copyWeekEmployeeSchedules
}