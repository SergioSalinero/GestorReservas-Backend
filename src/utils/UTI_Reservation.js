const {
    isCustomerBlocked
} = require('../repositories/DAO_Customers');
const {
    getServices,
    getServiceByName
} = require('../repositories/DAO_Services');
const {
    getEmployeeByName,
    getActivatedEmployees
} = require('../repositories/DAO_Employees');
const {
    getEmployeeAbsencesByDatetime
} = require('../repositories/DAO_EmployeeAbsences');
const {
    getEmployeeAbsences
} = require('../repositories/DAO_EmployeeAbsences');
const {
    getEmployeeSchedulesByEmployeeIdAndDate
} = require('../repositories/DAO_EmployeeSchedules');
const {
    checkReservationCustomerConflict,
    getReservationsByEmployeeAndDatetime,
    getNumberOfReservationsByEmployeeAndDate,
    checkReservationCustomerConflictExcludeReservation,
    getReservationsByEmployeeAndDatetimeExcludeReservation,
    getNumberOfReservationsByEmployeeAndDateExcludeReservation,
    getReservationsByEmployeeAndDate
} = require('../repositories/DAO_Reservations');
const {
    getSpecialSchedules,
    getSpecialSchedulesByDate,
    getSchedulesByDate,
    getSchedules
} = require('../repositories/DAO_Schedules');
const {
    isDateInFuture,
    isOpenDuringSchedule
} = require('./UTI_GeneralFeatures');
const { dayjs, TIMEZONE } = require('../config/timezone');


async function validateReservation(localId, reservationData) {
    // Comprobación de parámetros
    if (!reservationData.customer_name || typeof reservationData.customer_name !== 'string' || reservationData.customer_name.trim() === '')
        return { success: false, code: 1001, error: 'El nombre del cliente no es válido.' };

    if (!reservationData.customer_phone_number || !Number.isInteger(parseInt(reservationData.customer_phone_number)) || parseInt(reservationData.customer_phone_number) <= 0)
        return { success: false, code: 1002, error: 'El teléfono del cliente no es válido.' };

    if (!reservationData.datetime || typeof reservationData.datetime !== 'string' || reservationData.datetime.trim() === '')
        return { success: false, code: 1003, error: 'La fecha y hora no son válidas.' }

    // Comprobar que la fecha de la reserva sea mayor que la fecha actual (podríamos poner que sea mayor que la actual y una hora, por ejemplo)
    var datetime = reservationData.datetime;
    const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

    if (!datetime || !datetimeRegex.test(datetime))
        return { success: false, code: 1003, error: "El formato de la fecha y hora no son válidas." };


    if (!isDateInFuture(datetime))
        return { success: false, code: 1003, error: "No se puede reservar en el pasado." };


    // Comprobar si el cliente está bloqueado
    var response = await isCustomerBlocked(localId, reservationData.customer_phone_number);
    if (!response.success)
        return { success: false, code: 1008, error: "Error al comprobar si el cliente está bloqueado." };
    
    if (response.is_blocked)
        return { success: false, code: 1008, error: "El cliente está bloqueado y no puede hacer reservas." };

    // Comprobar si el servicio existe o si hay solo uno configurado
    response = await getServiceByName(localId, reservationData.service_name);
    var service;
    if (response.serviceData) {
        service = response.serviceData;
    }
    else {
        response = await getServices(localId);
        if (response.servicesData.length > 1)
            return { success: false, code: 1005, error: 'No se ha introducido un servicio válido y hay más de uno configurado.' };

        if (response.servicesData.length < 1)
            return { success: false, code: 1005, error: 'No hay servicios configurados.' };
        service = response.servicesData[0];
    }

    // Calcular la fecha y hora de finalización de la reserva
    const finalReservationDatetime = dayjs.tz(datetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE)
        .add(service.duration_minutes, 'minute')
        .format('YYYY-MM-DD HH:mm:ss');


    response = await checkReservationCustomerConflict(localId, reservationData.customer_phone_number, datetime, finalReservationDatetime);

    if (response.reservationsData.length > 0)
        return { success: false, code: 1004, error: 'El cliente ya tiene una reserva a esta hora.' };


    //const initialDate = datetime.split(' ')[0];
    const initialTime = datetime.split(' ')[1];

    const date = finalReservationDatetime.split(' ')[0];
    const time = finalReservationDatetime.split(' ')[1];

    // Comprobar si cuadra con el horario especial (si hay horarios especiales para ese día).
    response = await getSpecialSchedulesByDate(localId, date);
    const specialSchedule = response.specialScheduleData;

    if (specialSchedule) {
        if (specialSchedule.is_closed) {
            return { success: false, code: 1003, error: "El local está cerrado en el día especificado por horarios especiales.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }

        // Comprobar si la hora de la reserva está dentro del horario especial
        if (!isOpenDuringSchedule(initialTime, specialSchedule) && !isOpenDuringSchedule(time, specialSchedule)) {
            return { success: false, code: 1004, error: "El local no está abierto a la hora especificada por horarios especiales.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }
    }

    // Comprobar si cuadra con el horario laboral.
    response = await getSchedulesByDate(localId, finalReservationDatetime);
    const schedule = response.scheduleData;

    if (schedule) {
        if (schedule.is_closed) {
            return { success: false, code: 1003, error: "El local está cerrado en el día especificado por horario laboral.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }

        // Comprobar si la hora de la reserva está dentro del horario laboral
        if (!isOpenDuringSchedule(initialTime, schedule) || !isOpenDuringSchedule(time, schedule)) {
            return { success: false, code: 1004, error: "El local no está abierto a la hora especificada por horario laboral.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }
    }
    else
        return { success: false, code: 1003, error: "El local no tiene horario configurado para el día especificado." };


    // Comprobar si el empleado existe o si hay solo uno configurado
    response = await getEmployeeByName(localId, reservationData.employee_name);

    if (reservationData.employee_name && !response.employeeData)
        return { success: false, code: 1006, error: 'El empleado seleccionado no existe o no está activo.' };

    var employee;

    if (response.employeeData) {
        employee = response.employeeData;

        response = await getEmployeeAbsencesByDatetime(employee.id, datetime, finalReservationDatetime);
        const employeeAbsence = response.employeeAbsencesData;

        if (employeeAbsence > 0)
            return { success: false, code: 1006, error: 'El empleado seleccionado no está disponible en la fecha y hora especificadas por ausencia.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };

        response = await getEmployeeSchedulesByEmployeeIdAndDate(localId, employee.id, datetime);
        const employeeSchedules = response.employeeSchedulesData;

        if (!employeeSchedules || employeeSchedules.length < 1)
            return { success: false, code: 1006, error: 'El empleado seleccionado no tiene horario laboral configurado para la fecha especificada.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };

        if(!isOpenDuringSchedule(initialTime, employeeSchedules) || !isOpenDuringSchedule(time, employeeSchedules)) {
            return { success: false, code: 1006, error: 'El empleado seleccionado no está disponible en la fecha y hora especificadas por su horario laboral.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };
        }

        response = await getReservationsByEmployeeAndDatetime(employee.id, datetime, finalReservationDatetime);
        const employeeReservations = response.reservationsData;

        if (!response.success || employeeReservations.length > 0)
            return { success: false, code: 1006, error: 'El empleado seleccionado no está disponible en la fecha y hora especificadas por tener otra reserva.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };
    }
    else {
        response = await getActivatedEmployees(localId);

        if (response.employeesData.length < 1)
            return { success: false, code: 1006, error: 'No hay empleados configurados.' };

        const employees = response.employeesData;

        const availableEmployeeAbsences = [];
        for (const employee of employees) {
            response = await getEmployeeAbsencesByDatetime(employee.id, datetime, finalReservationDatetime);
            const employeeAbsence = response.employeeAbsencesData;

            if (employeeAbsence > 0)
                continue;

            availableEmployeeAbsences.push(employee);
        }

        if (availableEmployeeAbsences.length < 1)
            return { success: false, code: 1006, error: 'No hay empleados disponibles en la fecha y hora especificadas por ausencias.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };

        if (availableEmployeeAbsences.length == 1)
            employee = availableEmployeeAbsences[0];
        else {
            const availableEmployeesReservations = [];
            for (const employee of availableEmployeeAbsences) {
                response = await getReservationsByEmployeeAndDatetime(employee.id, datetime, finalReservationDatetime);
                const employeeReservations = response.reservationsData;

                if (employeeReservations.length > 0)
                    continue;

                response = await getEmployeeSchedulesByEmployeeIdAndDate(localId, employee.id, datetime);
                const employeeSchedules = response.employeeSchedulesData;

                if (!employeeSchedules || employeeSchedules.length < 1)
                    continue;

                if(!isOpenDuringSchedule(initialTime, employeeSchedules) || !isOpenDuringSchedule(time, employeeSchedules)) {
                    continue;
                }

                availableEmployeesReservations.push(employee);
            }

            if (availableEmployeesReservations?.length < 1)
                return { success: false, code: 1006, error: 'No hay empleados disponibles en la fecha y hora especificadas.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee?.id) };

            if (availableEmployeesReservations.length == 1)
                employee = availableEmployeesReservations[0];
            else {
                // Se tienen los empleados disponibles en la fecha y hora de la reserva, tanto por no estar ausentes como por no tener reservas
                // Se seleccionará el empleado que menos reservas asignadas tenga en el día de la actual reserva
                const employeesNumberOfReservations = [];
                for (const employee of availableEmployeesReservations) {
                    const numberOfReservations = await getNumberOfReservationsByEmployeeAndDate(employee.id, datetime);
                    employeesNumberOfReservations.push(numberOfReservations.numberOfReservations);
                }

                const minIndex = employeesNumberOfReservations.length
                    ? employeesNumberOfReservations.indexOf(Math.min(...employeesNumberOfReservations))
                    : 0;


                employee = availableEmployeesReservations[minIndex];
            }
        }
    }


    reservationData = {
        local_id: localId,
        //customer_id: ---
        service_id: service.id,
        employee_id: employee.id,
        name: reservationData.customer_name,
        service_name: service.name,
        employee_name: employee.name,
        initial_datetime: datetime,
        final_datetime: finalReservationDatetime,
        status: 'confirmed',
    }


    return { success: true, reservationData: reservationData };
}

async function getFreeReservationSlots(localId, datetime, durationMinutes, employeeId) {
    const date = datetime.split(' ')[0];
    const now = dayjs().tz(TIMEZONE).toDate();

    // 1. Horario del local y especial
    let response = await getSchedulesByDate(localId, datetime);
    if (!response.success)
        return [];
    const schedule = response.scheduleData;
    if (!schedule || schedule.is_closed)
        return [];

    response = await getSpecialSchedulesByDate(localId, date);
    if (!response.success)
        return [];
    const specialSchedule = response.specialScheduleData;
    if (specialSchedule && specialSchedule.is_closed)
        return [];

    const localSchedulePeriods = getSchedulePeriods(schedule, date);
    const localWorkingPeriods = specialSchedule
        ? intersectPeriods(localSchedulePeriods, getSchedulePeriods(specialSchedule, date))
        : localSchedulePeriods;
    if (localWorkingPeriods.length === 0)
        return [];

    // 2. Horario del empleado
    const employeeWorkingPeriodsRaw = await getEmployeeWorkingPeriods(localId, employeeId, datetime);
    if (!employeeWorkingPeriodsRaw || employeeWorkingPeriodsRaw.length === 0)
        return [];

    const employeeWorkingPeriods = intersectPeriods(localWorkingPeriods, employeeWorkingPeriodsRaw);
    if (employeeWorkingPeriods.length === 0)
        return [];

    // 3. Reservas y ausencias del empleado en el día
    response = await getReservationsByEmployeeAndDate(localId, employeeId, datetime);
    if (!response.success)
        return [];
    const reservations = (response.reservationsData || [])
        .map(res => [dayjs.tz(res.initial_datetime, TIMEZONE).toDate(), dayjs.tz(res.final_datetime, TIMEZONE).toDate()]);

    response = await getEmployeeAbsences(localId);
    if (!response.success)
        return [];
    const dayStart = dayjs.tz(date + ' 00:00:00', 'YYYY-MM-DD HH:mm:ss', TIMEZONE).toDate();
    const dayEnd = dayjs.tz(date + ' 23:59:59', 'YYYY-MM-DD HH:mm:ss', TIMEZONE).toDate();
    const absences = (response.employeeAbsencesData || [])
        .filter(abs => abs.employee_id === employeeId)
        .filter(abs => dayjs.tz(abs.initial_datetime, TIMEZONE).isBefore(dayEnd) && dayjs.tz(abs.final_datetime, TIMEZONE).isAfter(dayStart))
        .map(abs => [dayjs.tz(abs.initial_datetime, TIMEZONE).toDate(), dayjs.tz(abs.final_datetime, TIMEZONE).toDate()]);

    const busyIntervals = [...reservations, ...absences]
        .sort((a, b) => a[0] - b[0]);

    // 4. Calcular franjas libres respetando duración y evitando pasado
    const freeSlots = [];
    const durationMs = durationMinutes * 60 * 1000;

    for (const [workStartRaw, workEnd] of employeeWorkingPeriods) {
        // Evitar horas ya pasadas si el día es hoy
        const workStart = (isSameDate(workStartRaw, now) ? new Date(Math.max(workStartRaw.getTime(), now.getTime())) : workStartRaw);
        if (workEnd <= workStart) continue;

        let currentSlotStart = workStart;

        for (const [busyStart, busyEnd] of busyIntervals) {
            if (busyEnd <= workStart) continue;
            if (busyStart >= workEnd) break;

            const potentialSlotEnd = new Date(Math.min(busyStart.getTime(), workEnd.getTime()));
            if (potentialSlotEnd > currentSlotStart) {
                const gapDurationMs = potentialSlotEnd.getTime() - currentSlotStart.getTime();
                if (gapDurationMs >= durationMs) {
                    freeSlots.push([currentSlotStart, potentialSlotEnd]);
                }
            }
            currentSlotStart = new Date(Math.max(currentSlotStart.getTime(), busyEnd.getTime()));
            if (currentSlotStart >= workEnd) break;
        }

        if (workEnd > currentSlotStart) {
            const gapDurationMs = workEnd.getTime() - currentSlotStart.getTime();
            if (gapDurationMs >= durationMs) {
                freeSlots.push([currentSlotStart, workEnd]);
            }
        }
    }

    return freeSlots.map(([slotStart, slotEnd]) => [
        dayjs(slotStart).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
        dayjs(slotEnd).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
    ]);
}

// Devuelve los periodos laborales del empleado para un día concreto (como array de [start, end])
async function getEmployeeWorkingPeriods(localId, employeeId, datetime) {
    // datetime: 'YYYY-MM-DD HH:mm:ss'
    const date = datetime.split(' ')[0];
    // Obtener los horarios laborales del empleado para ese día
    const response = await getEmployeeSchedulesByEmployeeIdAndDate(localId, employeeId, datetime);
    const employeeSchedules = response && response.employeeSchedulesData ? response.employeeSchedulesData : null;
    if (!employeeSchedules || (Array.isArray(employeeSchedules) && employeeSchedules.length === 0)) {
        return [];
    }

    // Si employeeSchedules es un array, puede haber varios bloques
    const periods = [];
    const schedulesArr = Array.isArray(employeeSchedules) ? employeeSchedules : [employeeSchedules];
    for (const sch of schedulesArr) {
        if (sch.is_closed) continue;

        if (sch.morning_opening_time && sch.morning_closing_time) {
            const start = buildLocalDatetime(date, sch.morning_opening_time);
            const end = buildLocalDatetime(date, sch.morning_closing_time);
            if (start < end) periods.push([start, end]);
        }
        if (sch.afternoon_opening_time && sch.afternoon_closing_time) {
            const start = buildLocalDatetime(date, sch.afternoon_opening_time);
            const end = buildLocalDatetime(date, sch.afternoon_closing_time);
            if (start < end) periods.push([start, end]);
        }
    }

    return periods.sort((a, b) => a[0] - b[0]);
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

function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

async function getSchedulesAndSpecialSchedules(localId) {
    var schedules = await getSchedules(localId);
    var specialSchedules = await getSpecialSchedules(localId);
    return {
        schedules: schedules.schedulesData.map(x => {
            return {
                day: x.day,
                morning_opening_time: x.morning_opening_time,
                morning_closing_time: x.morning_closing_time,
                afternoon_opening_time: x.afternoon_opening_time,
                afternoon_closing_time: x.afternoon_closing_time,
                is_closed: x.is_closed
            }
        }),
        schedulesForVacationsDays: specialSchedules.specialSchedulesData.map(x => {
            return {
                date: x.date,
                morning_opening_time: x.morning_opening_time,
                morning_closing_time: x.morning_closing_time,
                afternoon_opening_time: x.afternoon_opening_time,
                afternoon_closing_time: x.afternoon_closing_time,
                is_closed: x.is_closed
            }
        })
    }
}

async function validateReservationExcludeReservation(localId, reservationData) {
    // Comprobación de parámetros
    if (!reservationData.customer_name || typeof reservationData.customer_name !== 'string' || reservationData.customer_name.trim() === '')
        return { success: false, code: 1001, error: 'El nombre del cliente no es válido.' };

    if (!reservationData.customer_phone_number || !Number.isInteger(parseInt(reservationData.customer_phone_number)) || parseInt(reservationData.customer_phone_number) <= 0)
        return { success: false, code: 1002, error: 'El teléfono del cliente no es válido.' };

    if (!reservationData.datetime || typeof reservationData.datetime !== 'string' || reservationData.datetime.trim() === '')
        return { success: false, code: 1003, error: 'La fecha y hora no son válidas.' }

    // Comprobar que la fecha de la reserva sea mayor que la fecha actual (podríamos poner que sea mayor que la actual y una hora, por ejemplo)
    var datetime = reservationData.datetime;
    const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

    if (!datetime || !datetimeRegex.test(datetime))
        return { success: false, code: 1003, error: "El formato de la fecha y hora no son válidas." };


    if (!isDateInFuture(datetime))
        return { success: false, code: 1003, error: "No se puede reservar en el pasado." };


    // Comprobar si el cliente está bloqueado
    var response = await isCustomerBlocked(localId, reservationData.customer_phone_number);
    if (!response.success)
        return { success: false, code: 1008, error: "Error al comprobar si el cliente está bloqueado." };
    
    if (response.is_blocked)
        return { success: false, code: 1008, error: "El cliente está bloqueado y no puede hacer reservas." };


    // Comprobar si el servicio existe o si hay solo uno configurado
    response = await getServiceByName(localId, reservationData.service_name);
    var service;
    if (response.serviceData) {
        service = response.serviceData;
    }
    else {
        response = await getServices(localId);
        if (response.servicesData.length > 1)
            return { success: false, code: 1005, error: 'No se ha introducido un servicio válido y hay más de uno configurado.' };

        if (response.servicesData.length < 1)
            return { success: false, code: 1005, error: 'No hay servicios configurados.' };
        service = response.servicesData[0];
    }

    // Calcular la fecha y hora de finalización de la reserva
    const finalReservationDatetime = dayjs.tz(datetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE)
        .add(service.duration_minutes, 'minute')
        .format('YYYY-MM-DD HH:mm:ss');


    response = await checkReservationCustomerConflictExcludeReservation(localId, reservationData.id, reservationData.customer_phone_number, datetime, finalReservationDatetime);

    if (response.reservationsData.length > 0)
        return { success: false, code: 1004, error: 'El cliente ya tiene una reserva a esta hora.' };


    const initialTime = datetime.split(' ')[1];

    const date = finalReservationDatetime.split(' ')[0];
    const time = finalReservationDatetime.split(' ')[1];

    // Comprobar si cuadra con el horario especial (si hay horarios especiales para ese día).
    response = await getSpecialSchedulesByDate(localId, date);
    const specialSchedule = response.specialScheduleData;

    if (specialSchedule) {
        if (specialSchedule.is_closed) {
            return { success: false, code: 1003, error: "El local está cerrado en el día especificado por horarios especiales.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }

        // Comprobar si la hora de la reserva está dentro del horario especial
        if (!isOpenDuringSchedule(initialTime, specialSchedule) && !isOpenDuringSchedule(time, specialSchedule)) {
            return { success: false, code: 1004, error: "El local no está abierto a la hora especificada por horarios especiales.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }
    }


    // Comprobar si cuadra con el horario laboral.
    response = await getSchedulesByDate(localId, finalReservationDatetime);
    const schedule = response.scheduleData;

    if (schedule) {
        if (schedule.is_closed) {
            return { success: false, code: 1003, error: "El local está cerrado en el día especificado por horario laboral.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }

        // Comprobar si la hora de la reserva está dentro del horario laboral
        if (!isOpenDuringSchedule(initialTime, schedule) || !isOpenDuringSchedule(time, schedule)) {
            return { success: false, code: 1004, error: "El local no está abierto a la hora especificada por horario laboral.", schedules: await getSchedulesAndSpecialSchedules(localId) };
        }
    }
    else
        return { success: false, code: 1003, error: "El local no tiene horario configurado para el día especificado." };


    // Comprobar si el empleado existe o si hay solo uno configurado
    response = await getEmployeeByName(localId, reservationData.employee_name);

    if (reservationData.employee_name && !response.employeeData)
        return { success: false, code: 1006, error: 'El empleado seleccionado no existe o no está activo.' };

    var employee;

    if (response.employeeData) {
        employee = response.employeeData;

        response = await getEmployeeAbsencesByDatetime(employee.id, datetime, finalReservationDatetime);
        const employeeAbsence = response.employeeAbsencesData;

        if (employeeAbsence > 0)
            return { success: false, code: 1006, error: 'El empleado seleccionado no está disponible en la fecha y hora especificadas por ausencia.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };

        response = await getEmployeeSchedulesByEmployeeIdAndDate(localId, employee.id, datetime);
        const employeeSchedules = response.employeeSchedulesData;

        if (!employeeSchedules || employeeSchedules.length < 1)
            return { success: false, code: 1006, error: 'El empleado seleccionado no tiene horario laboral configurado para la fecha especificada.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };

        if(!isOpenDuringSchedule(initialTime, employeeSchedules) || !isOpenDuringSchedule(time, employeeSchedules)) {
            return { success: false, code: 1006, error: 'El empleado seleccionado no está disponible en la fecha y hora especificadas por su horario laboral.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };
        }

        response = await getReservationsByEmployeeAndDatetimeExcludeReservation(reservationData.id, employee.id, datetime, finalReservationDatetime);
        const employeeReservations = response.reservationsData;

        if (!response.success || employeeReservations.length > 0)
            return { success: false, code: 1006, error: 'El empleado seleccionado no está disponible en la fecha y hora especificadas por tener otra reserva.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };
    }
    else {
        response = await getActivatedEmployees(localId);

        if (response.employeesData.length < 1)
            return { success: false, code: 1006, error: 'No hay empleados configurados.' };

        const employees = response.employeesData;

        const availableEmployeeAbsences = [];
        for (const employee of employees) {
            response = await getEmployeeAbsencesByDatetime(employee.id, datetime, finalReservationDatetime);
            const employeeAbsence = response.employeeAbsencesData;

            if (employeeAbsence > 0)
                continue;

            availableEmployeeAbsences.push(employee);
        }

        if (availableEmployeeAbsences.length < 1)
            return { success: false, code: 1006, error: 'No hay empleados disponibles en la fecha y hora especificadas por ausencias.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee.id) };

        if (availableEmployeeAbsences.length == 1)
            employee = availableEmployeeAbsences[0];
        else {
            const availableEmployeesReservations = [];
            for (const employee of availableEmployeeAbsences) {
                response = await getReservationsByEmployeeAndDatetimeExcludeReservation(reservationData.id, employee.id, datetime, finalReservationDatetime);
                const employeeReservations = response.reservationsData;

                if (employeeReservations.length > 0)
                    continue;

                response = await getEmployeeSchedulesByEmployeeIdAndDate(localId, employee.id, datetime);
                const employeeSchedules = response.employeeSchedulesData;
                
                if (!employeeSchedules || employeeSchedules.length < 1)
                    continue;

                if(!isOpenDuringSchedule(initialTime, employeeSchedules) || !isOpenDuringSchedule(time, employeeSchedules)) {
                    continue;
                }

                availableEmployeesReservations.push(employee);
            }

            if (availableEmployeesReservations.length < 1)
                return { success: false, code: 1006, error: 'No hay empleados disponibles en la fecha y hora especificadas por tener otra reserva.', freeReservationSlots: await getFreeReservationSlots(localId, datetime, service.duration_minutes, employee?.id) };

            if (availableEmployeesReservations.length == 1)
                employee = availableEmployeesReservations[0];
            else {
                // Se tienen los empleados disponibles en la fecha y hora de la reserva, tanto por no estar ausentes como por no tener reservas
                // Se seleccionará el empleado que menos reservas asignadas tenga en el día de la actual reserva
                const employeesNumberOfReservations = [];
                for (const employee of availableEmployeesReservations) {
                    const numberOfReservations = await getNumberOfReservationsByEmployeeAndDateExcludeReservation(reservationData.id, employee.id, datetime);
                    employeesNumberOfReservations.push(numberOfReservations.numberOfReservations);
                }

                const minIndex = employeesNumberOfReservations.length
                    ? employeesNumberOfReservations.indexOf(Math.min(...employeesNumberOfReservations))
                    : 0;


                employee = availableEmployeesReservations[minIndex];
            }
        }
    }


    reservationData = {
        id: reservationData.id,
        local_id: localId,
        //customer_id: ---
        service_id: service.id,
        employee_id: employee.id,
        name: reservationData.customer_name,
        service_name: service.name,
        employee_name: employee.name,
        initial_datetime: datetime,
        final_datetime: finalReservationDatetime,
        status: reservationData.status,
    }


    return { success: true, reservationData: reservationData };
}


module.exports = {
    validateReservation,
    validateReservationExcludeReservation,
    getEmployeeWorkingPeriods
}
