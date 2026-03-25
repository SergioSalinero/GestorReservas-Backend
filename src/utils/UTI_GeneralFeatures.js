const { dayjs, TIMEZONE } = require('../config/timezone');

function isDateInFuture(datetime) {
    const inputDate = dayjs.tz(datetime, 'YYYY-MM-DD HH:mm:ss', TIMEZONE);
    if (!inputDate.isValid())
        return false;

    const now = dayjs().tz(TIMEZONE);
    return inputDate.isAfter(now);
}

function isOpenDuringSchedule(time, schedule) {
    if (
        (schedule.morning_opening_time && time >= schedule.morning_opening_time && time <= schedule.morning_closing_time) ||
        (schedule.afternoon_opening_time && time >= schedule.afternoon_opening_time && time <= schedule.afternoon_closing_time)
    ) {
        return true;
    }

    return false;
}

module.exports = {
    isDateInFuture,
    isOpenDuringSchedule
}
