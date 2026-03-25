const express = require('express');
const { 
    authenticateAgentToken,
    authenticateStaticToken
 } = require('../../config/MID_JWTManagement');
const {
    validateReservation,
    validateReservationExcludeReservation,
} = require('../../utils/UTI_Reservation');
const {
    setCustomer,
    getCustomerByPhoneNumber,
    updateCustomerReservationsCountByPhoneNumber
} = require('../../repositories/DAO_Customers');
const {
    setReservation,
    cancelReservations,
    getReservationIdByCustomerNumberAndDatetime,
    getReservationsByCustomerId,
    updateReservation,
    getReservationById,
    updateStatusReservations
} = require('../../repositories/DAO_Reservations');
const { dayjs, TIMEZONE } = require('../../config/timezone');

const router = express.Router("/agent");

const buildReservationResponseData = (reservationData) => ({
    name: reservationData.name,
    service_name: reservationData.service_name,
    employee_name: reservationData.employee_name,
    initial_datetime: dayjs(reservationData.initial_datetime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
    final_datetime: dayjs(reservationData.final_datetime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
    status: reservationData.status
});

router.post('/insert_reservation', authenticateAgentToken, async (req, res) => {
    const reservationData = req.body;
    const { localId } = req.localId;
    
    // Normalizar employee_name: si viene como string "null"
    if (typeof reservationData.employee_name === 'string' && reservationData.employee_name.trim().toLowerCase() === 'null')
        reservationData.employee_name = null;

    var response = await validateReservation(localId, reservationData);
    if (!response.success) {
        if (response.code === 1006)
            return res.status(200).json({ success: false, output: response.error, freeReservationSlots: response.freeReservationSlots });
        else
            return res.status(200).json({ success: false, output: response.error, schedules: response.schedules });
    }

    const reservation = response.reservationData;

    
    response = await getCustomerByPhoneNumber(localId, reservationData.customer_phone_number);
    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent/insert_reservation (' + localId + ') (getCustomerByPhoneNumber): ' + response.error });

    var customerData;
    if (response.customerData.length > 0) {
        // Si el cliente existe, actualizar el contador "num_reservations"
        response = await updateCustomerReservationsCountByPhoneNumber(localId, reservationData.customer_phone_number);

        if (!response.success)
            return res.status(500).json({ success: false, error: '/agent/insert_reservation (' + localId + ') (updateCustomerReservationsCountByPhoneNumber): ' + response.error });

        customerData = response.customerData;
    }
    else {
        // Si el cliente no existe, crear su registro
        const customerDataAux = {
            local_id: localId,
            name: reservationData.customer_name,
            phone_number: reservationData.customer_phone_number
        }

        response = await setCustomer(localId, customerDataAux);

        if (!response.success)
            return res.status(500).json({ success: false, error: '/agent/insert_reservation (' + localId + ') (setCustomer): ' + response.error });

        customerData = response.customerData;
    }


    // Añadir el identificador del cliente a la reserva
    reservation.customer_id = customerData.id;
    reservation.phone_number = customerData.phone_number;

    response = await setReservation(reservation);

    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent/insert_reservation (' + localId + ') (setReservation): ' + response.error });


    // Borrar la memoria del agente
    // response = await deleteAgentMemorybySessionId(reservationData.local_phone_number + '' + reservationData.customer_phone_number);
    // if (!response.success)
    //     console.error('/agent/insert_reservation (' + localId + ') (deleteAgentMemorybySessionId): ' + response.error);

    if (response.success)
        return res.status(200).json({ success: true, output: "¡Perfecto! Tu reserva ha sido confirmada con los siguientes detalles:\n\n👤 Nombre: " + reservation.name + "\n📅 Fecha y hora: " + reservation.initial_datetime + "\n👷 Empleado: " + reservation.employee_name + "\n✂️ Servicio: " + reservation.service_name + "\n\n¡Gracias por reservar!" });
    else
        return res.status(500).json({ success: false, error: '/agent/insert_reservation (' + localId + ') (setReservation): ' + response.error });

});

router.post('/cancel_reservation', authenticateAgentToken, async(req, res) => {
    const reservationData = req.body;
    const { localId } = req.localId;

    let response = await getReservationIdByCustomerNumberAndDatetime(localId, reservationData.customer_phone_number, reservationData.datetime);
    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent/cancel_reservation (' + localId + ') (getReservationIdByCustomerNumberAndDatetime): ' + response.error });
    if (response.success && response.reservationData.length === 0) {
        const customerResponse = await getCustomerByPhoneNumber(localId, reservationData.customer_phone_number);
        if (!customerResponse.success)
            return res.status(500).json({ success: false, error: '/agent/cancel_reservation (' + localId + ') (getCustomerByPhoneNumber): ' + customerResponse.error });
        if (!customerResponse.customerData || customerResponse.customerData.length === 0) {
            return res.status(200).json({ success: false, output: 'No hay ningún cliente asociado al número de teléfono dado.', clientReservations: [] });
        }

        const customerReservationsResponse = await getReservationsByCustomerId(localId, customerResponse.customerData[0].id);
        if (!customerReservationsResponse.success)
            return res.status(500).json({ success: false, error: '/agent/cancel_reservation (' + localId + ') (getReservationsByCustomerId): ' + customerReservationsResponse.error });

        return res.status(200).json({ success: false, output: 'No hay ninguna reserva asociada al número de telefono y fecha dada.', clientReservations: (customerReservationsResponse.reservationsData || []).map(reservation => dayjs(reservation.initial_datetime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')) });
    }
    const reservationsData = response.reservationData

    response = await cancelReservations(localId, reservationsData);

    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent/cancel_reservation (' + localId + ') (cancelReservations): ' + response.error });

    const cancelledReservationsData = [];
    for (const reservationIdData of reservationsData) {
        const cancelledReservationResponse = await getReservationById(reservationIdData.id);
        if (!cancelledReservationResponse.success)
            return res.status(500).json({ success: false, error: '/agent/cancel_reservation (' + localId + ') (getReservationById): ' + cancelledReservationResponse.error });

        if (cancelledReservationResponse.reservationData && cancelledReservationResponse.reservationData.length > 0)
            cancelledReservationsData.push(buildReservationResponseData(cancelledReservationResponse.reservationData[0]));
    }

    
    // Borrar la memoria del agente
    // response = await deleteAgentMemorybySessionId(reservationData.local_phone_number + '' + reservationData.customer_phone_number);
    // if (!response.success)
    //     console.error('/agent/cancel_reservation (' + localId + ') (deleteAgentMemorybySessionId): ' + response.error);

    if(response.success)
        return res.status(200).json({ success: true, output: response.messages, reservationsData: cancelledReservationsData });
    else
        return res.status(500).json({ success: false, error: response.error });
});

const updateReservationByField = async (req, res, fieldName, endpointPath) => {
    const reservationData = req.body;
    const { localId } = req.localId;

    if (fieldName === 'employee_name' && typeof reservationData.employee_name === 'string' && reservationData.employee_name.trim().toLowerCase() === 'null')
        reservationData.employee_name = null;

    // Obtener el id de la reserva a partir del número de teléfono del cliente y la fecha y hora antigua
    var response = await getReservationIdByCustomerNumberAndDatetime(localId, reservationData.customer_phone_number, reservationData.old_datetime);
    if (response.success && response.reservationData.length === 0) {
        const customerResponse = await getCustomerByPhoneNumber(localId, reservationData.customer_phone_number);
        if (!customerResponse.success)
            return res.status(500).json({ success: false, error: '/agent' + endpointPath + ' (' + localId + ') (getCustomerByPhoneNumber): ' + customerResponse.error });
        if (!customerResponse.customerData || customerResponse.customerData.length === 0) {
            return res.status(200).json({ success: false, output: 'No hay ningún cliente asociado al número de teléfono dado.', clientReservations: [] });
        }

        const customerReservationsResponse = await getReservationsByCustomerId(localId, customerResponse.customerData[0].id);
        if (!customerReservationsResponse.success)
            return res.status(500).json({ success: false, error: '/agent' + endpointPath + ' (' + localId + ') (getReservationsByCustomerId): ' + customerReservationsResponse.error });

        return res.status(200).json({ success: false, output: 'No hay ninguna reserva asociada al número de telefono y fecha dada.', clientReservations: (customerReservationsResponse.reservationsData || []).map(reservation => dayjs(reservation.initial_datetime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')) });
    }
    const reservationId = response.reservationData[0].id;

    // Obtener todos los datos de la reserva actual
    var response = await getReservationById(reservationId);
    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent' + endpointPath + ' (' + localId + ') (getReservationById): ' + response.error });
    const actualReservationData = response.reservationData[0];

    const fieldValue = reservationData[fieldName];
    if (fieldValue == null || fieldValue == "null")
        return res.status(200).json({ success: false, output: 'No se han proporcionado datos nuevos para actualizar la reserva.' });

    if (fieldName === 'service_name' && reservationData.service_name == actualReservationData.service_name)
        return res.status(200).json({ success: false, output: 'No se han proporcionado datos nuevos para actualizar la reserva.' });

    if (fieldName === 'employee_name' && reservationData.employee_name == actualReservationData.employee_name)
        return res.status(200).json({ success: false, output: 'No se han proporcionado datos nuevos para actualizar la reserva.' });

    const currentReservationDatetime = `${actualReservationData.initial_datetime.getFullYear()}-${String(actualReservationData.initial_datetime.getMonth() + 1).padStart(2, "0")}-${String(actualReservationData.initial_datetime.getDate()).padStart(2, "0")} ${String(actualReservationData.initial_datetime.getHours()).padStart(2, "0")}:${String(actualReservationData.initial_datetime.getMinutes()).padStart(2, "0")}:${String(actualReservationData.initial_datetime.getSeconds()).padStart(2, "0")}`;

    if (fieldName === 'datetime' && reservationData.datetime == currentReservationDatetime)
        return res.status(200).json({ success: false, output: 'No se han proporcionado datos nuevos para actualizar la reserva.' });

    const newReservationData = {
        id: actualReservationData.id,
        customer_phone_number: actualReservationData.phone_number,
        customer_name: actualReservationData.name,
        service_name: fieldName === 'service_name' ? reservationData.service_name : actualReservationData.service_name,
        employee_name: fieldName === 'employee_name' ? reservationData.employee_name : actualReservationData.employee_name,
        datetime: fieldName === 'datetime' ? reservationData.datetime : currentReservationDatetime,
    }
    
    var response = await validateReservationExcludeReservation(localId, newReservationData);
    if (!response.success) {
        if (response.code === 1006)
            return res.status(200).json({ success: false, output: response.error, freeReservationSlots: response.freeReservationSlots });
        else
            return res.status(200).json({ success: false, output: response.error, schedules: response.schedules });
    }
    const reservation = response.reservationData;

    reservation.customer_id = actualReservationData.customer_id;
    reservation.phone_number = actualReservationData.phone_number;

    response = await updateReservation(reservation);
    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent' + endpointPath + ' (' + localId + ') (updateReservation): ' + response.error });

    const updatedReservationResponse = await getReservationById(reservation.id);
    if (!updatedReservationResponse.success)
        return res.status(500).json({ success: false, error: '/agent' + endpointPath + ' (' + localId + ') (getReservationById): ' + updatedReservationResponse.error });

    const updatedReservationData = updatedReservationResponse.reservationData && updatedReservationResponse.reservationData.length > 0
        ? buildReservationResponseData(updatedReservationResponse.reservationData[0])
        : buildReservationResponseData(reservation);

    // Borrar la memoria del agente
    // response = await deleteAgentMemorybySessionId(reservationData.local_phone_number + '' + reservationData.customer_phone_number);
    // if (!response.success)
    //     console.error('/agent' + endpointPath + ' (' + localId + ') (deleteAgentMemorybySessionId): ' + response.error);

    if(response.success)
        return res.status(200).json({ success: true, output: response.message, reservationData: updatedReservationData });
    else
        return res.status(500).json({ success: false, error: response.error });
};

router.post('/update_datetime', authenticateAgentToken, async(req, res) => {
    return updateReservationByField(req, res, 'datetime', '/update_datetime');
});

router.post('/update_employee', authenticateAgentToken, async(req, res) => {
    return updateReservationByField(req, res, 'employee_name', '/update_employee');
});

router.post('/update_service', authenticateAgentToken, async(req, res) => {
    return updateReservationByField(req, res, 'service_name', '/update_service');
});

router.get('/get_customer_reservations', authenticateAgentToken, async(req, res) => {
    const { customer_phone_number } = req.query;
    const { localId } = req.localId;

    if (!customer_phone_number)
        return res.status(400).json({ success: false, error: '/agent/get_customer_reservations: Falta customer_phone_number en query.' });

    let response = await getCustomerByPhoneNumber(localId, customer_phone_number);
    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent/get_customer_reservations (' + localId + ') (getCustomerByPhoneNumber): ' + response.error });
    if (!response.customerData || response.customerData.length === 0)
        return res.status(200).json({ success: false, output: 'No hay ningún cliente asociado al número de teléfono dado.', clientReservations: [] });
    const customerId = response.customerData[0].id;

    response = await getReservationsByCustomerId(localId, customerId);
    if (!response.success)
        return res.status(500).json({ success: false, error: '/agent/get_customer_reservations (' + localId + ') (getReservationsByCustomerId): ' + response.error });

    const clientReservations = (response.reservationsData || []).map(reservation => ({
        initial_datetime: dayjs(reservation.initial_datetime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
        final_datetime: dayjs(reservation.final_datetime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
    }));

    return res.status(200).json({ success: true, clientReservations });
});

router.post('/update_status_reservations', authenticateStaticToken, async(req, res) => {
    var response = await updateStatusReservations();

    if (!response.success)
        return res.status(500).json({ error: '/agent/change_status_reservation (updateStatusReservations): ' + response.error });
    else
        return res.status(200).json({ output: response.message });
});

module.exports = router;
