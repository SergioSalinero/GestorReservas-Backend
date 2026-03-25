const { getDbConnection } = require('../config/CON_DBConnection');
const { dayjs, TIMEZONE } = require('../config/timezone');
const { v4: uuidv4 } = require('uuid');


// SPECIAL SCHEDULES...........................................................................................................................
async function setSpecialSchedules(localId, specialSchedulesData) {
    const pool = getDbConnection();

    try {
        for (const specialSchedule of specialSchedulesData) {
            const id = uuidv4();

            await pool.query(
                `
                INSERT INTO special_schedules
                (id, local_id, date, morning_opening_time, morning_closing_time, afternoon_opening_time, afternoon_closing_time, is_closed, reason, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());
                `,
                [
                    id,
                    localId,
                    specialSchedule.date,
                    specialSchedule.morning_opening_time || null,
                    specialSchedule.morning_closing_time || null,
                    specialSchedule.afternoon_opening_time || null,
                    specialSchedule.afternoon_closing_time || null,
                    specialSchedule.is_closed,
                    specialSchedule.reason || null
                ]
            );
        }

        return { success: true, message: 'Special schedules saved' };
    } catch (error) {
        console.error('setSpecialSchedules (' + localId + '): ', error);
        
        if (error.code === '23505') {
            return { success: false, code: 7001, error: 'Este día ya tiene horarios especiales configurados' };
        }

        return { success: false, error: error.message };
    }
}

async function getSpecialSchedules(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM special_schedules WHERE local_id = $1 ORDER BY date ASC;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, specialSchedulesData: res.rows || null };
    } catch (error) {
        console.error('getSpecialSchedules (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getSpecialSchedulesByDate(localId, date) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM special_schedules WHERE local_id = $1 AND date = $2;
    `;

    try {
        const res = await pool.query(query, [localId, date]);
        return { success: true, specialScheduleData: res.rows[0] || null };
    } catch (error) {
        console.error('geSpecialSchedulesByDate (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

const setSpecialSchedule = async (localId, specialScheduleData) => {
    const pool = getDbConnection();

    try {
        const query = `
            UPDATE special_schedules
            SET date = $1,
                morning_opening_time = $2,
                morning_closing_time = $3,
                afternoon_opening_time = $4,
                afternoon_closing_time = $5,
                is_closed = $6,
                reason = $7,
                updated_at = NOW()
            WHERE local_id = $8 AND id = $9
            RETURNING *;
        `;
        const values = [
            specialScheduleData.date,
            specialScheduleData.morning_opening_time || null,
            specialScheduleData.morning_closing_time || null,
            specialScheduleData.afternoon_opening_time || null,
            specialScheduleData.afternoon_closing_time || null,
            specialScheduleData.is_closed,
            specialScheduleData.reason || null,
            localId,
            specialScheduleData.id
        ];

        await pool.query(query, values);
        

        return { success: true, message: 'Special schedule updated' };
    } catch (error) {
        console.error('setSpecialSchedule (' + localId + '): ', error);
        
        if (error.code === '23505') {
            return { success: false, code: 7001, error: 'Este día ya tiene horarios especiales configurados' };
        }

        return { success: false, error: error.message };
    }
}

async function deleteSpecialSchedules(localId, specialSchedulesData) {
    const pool = getDbConnection();

    const query = `
        DELETE FROM special_schedules
        WHERE local_id = $1 and id = $2;
    `;

    try {
        for (const specialScheduleData of specialSchedulesData) {
            await pool.query(query, [localId, specialScheduleData.id]);
        }
        return { success: true, messages: 'Special schedule deleted' };
    } catch (error) {
        console.error('deleteSpecialSchedules (' + localId + '):', error);
        return { success: false, error: error.message };
    }
}


// SCHEDULES...................................................................................................................................
async function setSchedules(localId, schedulsData) {
    const pool = getDbConnection();

    try {
        const query = `DELETE FROM schedules WHERE local_id = $1;`;
        await pool.query(query, [localId]);

        for (const schedule of schedulsData) {
            const id = uuidv4();

            await pool.query(
                `
                INSERT INTO schedules
                (id, local_id, day, morning_opening_time, morning_closing_time, afternoon_opening_time, afternoon_closing_time, is_closed, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW());
                `,
                [
                    id,
                    localId,
                    schedule.day,
                    schedule.morning_opening_time || null,
                    schedule.morning_closing_time || null,
                    schedule.afternoon_opening_time || null,
                    schedule.afternoon_closing_time || null,
                    schedule.is_closed
                ]
            );
        }

        return { success: true, message: 'Schedules saved' };
    } catch (error) {
        console.error('setSchedules (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getSchedules(localId) {
    const pool = getDbConnection();

    const query = `
        SELECT * FROM schedules WHERE local_id = $1
        ORDER BY CASE LOWER(day)
            WHEN 'monday' THEN 1
            WHEN 'tuesday' THEN 2
            WHEN 'wednesday' THEN 3
            WHEN 'thursday' THEN 4
            WHEN 'friday' THEN 5
            WHEN 'saturday' THEN 6
            WHEN 'sunday' THEN 7
            ELSE 8
        END;
    `;

    try {
        const res = await pool.query(query, [localId]);
        return { success: true, schedulesData: res.rows || null };
    } catch (error) {
        console.error('getSchedules (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

async function getSchedulesByDate(localId, datetime) {
    const pool = getDbConnection();

    const dateObj = dayjs.tz(datetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE);
    if (!dateObj.isValid())
        return { success: false, error: 'Fecha inválida' };
    const dayOfWeek = dateObj.day();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayOfWeek];

    const query = `
        SELECT * FROM schedules WHERE local_id = $1 AND day = $2;
    `;

    try {
        const res = await pool.query(query, [localId, dayName]);
        return { success: true, scheduleData: res.rows[0] || null };
    } catch (error) {
        console.error('getSchedulesByDate (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

const setSchedule = async (localId, scheduleData) => {
    const pool = getDbConnection();

    try {
        const query = `
            UPDATE schedules
            SET morning_opening_time = $1,
                morning_closing_time = $2,
                afternoon_opening_time = $3,
                afternoon_closing_time = $4,
                is_closed = $5,
                updated_at = NOW()
            WHERE local_id = $6 AND id = $7;
        `;
        const values = [
            scheduleData.morning_opening_time || null,
            scheduleData.morning_closing_time || null,
            scheduleData.afternoon_opening_time || null,
            scheduleData.afternoon_closing_time || null,
            scheduleData.is_closed,
            localId,
            scheduleData.id
        ];

        await pool.query(query, values);

        return { success: true, message: 'Schedule updated' };
    } catch (error) {
        console.error('setSchedule (' + localId + '): ', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    setSpecialSchedules,
    getSpecialSchedules,
    getSpecialSchedulesByDate,
    setSpecialSchedule,
    deleteSpecialSchedules,
    setSchedules,
    getSchedules,
    getSchedulesByDate,
    setSchedule
}