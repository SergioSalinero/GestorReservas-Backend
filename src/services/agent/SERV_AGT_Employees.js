const express = require('express');
const { authenticateAgentToken } = require('../../config/MID_JWTManagement');
const { 
    getEmployees
} = require('../../repositories/DAO_Employees')
const {
    getSpecialSchedulesByDate,
    getSchedulesByDate
} = require('../../repositories/DAO_Schedules');
const {
    getEmployeeAbsencesByDatetime
} = require('../../repositories/DAO_EmployeeAbsences');
const {
    getEmployeeSchedulesByEmployeeIdAndDate
} = require('../../repositories/DAO_EmployeeSchedules');
const {
    getReservationsByEmployeeAndDate
} = require('../../repositories/DAO_Reservations');
const {
    isOpenDuringSchedule
} = require('../../utils/UTI_GeneralFeatures');
const { dayjs, TIMEZONE } = require('../../config/timezone');

const router = express.Router();
const SLOT_DURATION_MINUTES = 30;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function formatTime(dateObj) {
    return dayjs(dateObj).tz(TIMEZONE).format('HH:mm:ss');
}

function formatDatetime(dateObj) {
    return dayjs(dateObj).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}

function parseDateAsLocal(date) {
    const parsed = dayjs.tz(date, 'YYYY-MM-DD', TIMEZONE);
    if (!parsed.isValid())
        return null;
    return parsed.startOf('day').toDate();
}

function buildLocalDatetime(date, time) {
    return dayjs.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm:ss', TIMEZONE).toDate();
}

function getSchedulePeriods(schedule, date) {
    if (!schedule) return [];

    const periods = [];

    if (schedule.morning_opening_time && schedule.morning_closing_time) {
        const start = buildLocalDatetime(date, schedule.morning_opening_time);
        const end = buildLocalDatetime(date, schedule.morning_closing_time);

        if (start < end) periods.push([start, end]);
    }

    if (schedule.afternoon_opening_time && schedule.afternoon_closing_time) {
        const start = buildLocalDatetime(date, schedule.afternoon_opening_time);
        const end = buildLocalDatetime(date, schedule.afternoon_closing_time);

        if (start < end) periods.push([start, end]);
    }

    return periods.sort((a, b) => a[0] - b[0]);
}

function intersectPeriods(periodsA, periodsB) {
    const intersections = [];

    for (const [startA, endA] of periodsA) {
        for (const [startB, endB] of periodsB) {
            const start = new Date(Math.max(startA.getTime(), startB.getTime()));
            const end = new Date(Math.min(endA.getTime(), endB.getTime()));

            if (start < end) intersections.push([start, end]);
        }
    }

    return intersections.sort((a, b) => a[0] - b[0]);
}

function hasStrictOverlap(initialDatetime, finalDatetime, reservations) {
    const slotStart = dayjs.tz(initialDatetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE).toDate();
    const slotEnd = dayjs.tz(finalDatetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE).toDate();

    return reservations.some(reservation => {
        const reservationStart = dayjs.tz(reservation.initial_datetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE).toDate();
        const reservationEnd = dayjs.tz(reservation.final_datetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE).toDate();

        return slotStart < reservationEnd && slotEnd > reservationStart;
    });
}

router.get('/get_employees_names', authenticateAgentToken, async(req, res) => {
    const { date } = req.query;
    const { localId } = req.localId;

    if (!date)
        return res.status(400).json({ error: '/agent/get_employees_names: Falta date en query.' });
    if (!DATE_REGEX.test(date))
        return res.status(400).json({ error: '/agent/get_employees_names: El formato de date debe ser YYYY-MM-DD.' });

    const requestedDate = parseDateAsLocal(date);
    if (!requestedDate)
        return res.status(400).json({ error: '/agent/get_employees_names: La date indicada no es válida.' });

    const today = dayjs().tz(TIMEZONE).startOf('day').toDate();
    if (requestedDate < today)
        return res.status(400).json({ error: '/agent/get_employees_names: No se pueden consultar fechas pasadas.' });

    let response = await getEmployees(localId);
    if(!response.success)
        return res.status(500).json({ error: '/agent/get_employees_names (' + localId + '): ' + response.error });
    if(response.success && response.employeesData.length === 0)
        return res.status(500).json({ error: '/agent/get_employees_names (' + localId + '): ' + 'No hay ningún empleado asociado a este local' });
    const employees = response.employeesData;

    const queryDateTime = `${date} 00:00:00`;

    response = await getSchedulesByDate(localId, queryDateTime);
    if (!response.success)
        return res.status(500).json({ error: '/agent/get_employees_names (' + localId + ') (getSchedulesByDate): ' + response.error });
    const schedule = response.scheduleData;

    response = await getSpecialSchedulesByDate(localId, date);
    if (!response.success)
        return res.status(500).json({ error: '/agent/get_employees_names (' + localId + ') (getSpecialSchedulesByDate): ' + response.error });
    const specialSchedule = response.specialScheduleData;

    const emptyResponse = {
        date,
        duration_minutes: SLOT_DURATION_MINUTES,
        employees_available: [],
        free_slots: []
    };

    if (!schedule || schedule.is_closed)
        return res.status(200).json(emptyResponse);

    if (specialSchedule && specialSchedule.is_closed)
        return res.status(200).json(emptyResponse);

    const localSchedulePeriods = getSchedulePeriods(schedule, date);
    if (localSchedulePeriods.length < 1)
        return res.status(200).json(emptyResponse);

    const localWorkingPeriods = specialSchedule
        ? intersectPeriods(localSchedulePeriods, getSchedulePeriods(specialSchedule, date))
        : localSchedulePeriods;

    if (localWorkingPeriods.length < 1)
        return res.status(200).json(emptyResponse);

    const now = dayjs().tz(TIMEZONE).toDate();
    const freeSlots = [];

    for (const employee of employees) {
        response = await getEmployeeSchedulesByEmployeeIdAndDate(localId, employee.id, date);
        if (!response.success) {
            return res.status(500).json({ error: '/agent/get_employees_names (' + localId + ') (getEmployeeSchedulesByEmployeeIdAndDate): ' + response.error });
        }

        const employeeSchedule = response.employeeSchedulesData;
        if (!employeeSchedule) continue;

        const employeePeriods = getSchedulePeriods(employeeSchedule, date);
        if (employeePeriods.length < 1) continue;

        const candidatePeriods = intersectPeriods(localWorkingPeriods, employeePeriods);
        if (candidatePeriods.length < 1) continue;

        response = await getReservationsByEmployeeAndDate(localId, employee.id, queryDateTime);
        if (!response.success) {
            return res.status(500).json({ error: '/agent/get_employees_names (' + localId + ') (getReservationsByEmployeeAndDate): ' + response.error });
        }
        const employeeReservations = response.reservationsData || [];

        const slots = [];
        const durationMs = SLOT_DURATION_MINUTES * 60 * 1000;

        for (const [periodStart, periodEnd] of candidatePeriods) {
            let currentSlotStart = new Date(periodStart.getTime());

            while (currentSlotStart.getTime() + durationMs <= periodEnd.getTime()) {
                const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMs);
                const initialTime = formatTime(currentSlotStart);
                const finalTime = formatTime(currentSlotEnd);

                if (currentSlotStart <= now) {
                    currentSlotStart = currentSlotEnd;
                    continue;
                }

                if (!isOpenDuringSchedule(initialTime, schedule) || !isOpenDuringSchedule(finalTime, schedule)) {
                    currentSlotStart = currentSlotEnd;
                    continue;
                }

                if (specialSchedule && (!isOpenDuringSchedule(initialTime, specialSchedule) || !isOpenDuringSchedule(finalTime, specialSchedule))) {
                    currentSlotStart = currentSlotEnd;
                    continue;
                }

                const initialDatetime = formatDatetime(currentSlotStart);
                const finalDatetime = formatDatetime(currentSlotEnd);

                response = await getEmployeeAbsencesByDatetime(employee.id, initialDatetime, finalDatetime);
                if (!response.success) {
                    return res.status(500).json({ error: '/agent/get_employees_names (' + localId + ') (getEmployeeAbsencesByDatetime): ' + response.error });
                }

                if (response.employeeAbsencesData > 0) {
                    currentSlotStart = currentSlotEnd;
                    continue;
                }

                if (employeeReservations.length > 0 && hasStrictOverlap(initialDatetime, finalDatetime, employeeReservations)) {
                    currentSlotStart = currentSlotEnd;
                    continue;
                }

                slots.push(initialTime);
                currentSlotStart = currentSlotEnd;
            }
        }

        if (slots.length > 0) {
            freeSlots.push({
                employee_name: employee.name,
                slots
            });
        }
    }

    return res.status(200).json({
        date,
        duration_minutes: SLOT_DURATION_MINUTES,
        employees_available: freeSlots.map(slotData => slotData.employee_name),
        free_slots: freeSlots
    });
});

module.exports = router;
