const express = require('express');
const { authenticateToken } = require('../../config/MID_JWTManagement');
const {
    validateReservation,
    validateReservationExcludeReservation
} = require('../../utils/UTI_Reservation');
const {
    setCustomer,
    getCustomerByPhoneNumber,
    updateCustomerReservationsCountByPhoneNumber
} = require('../../repositories/DAO_Customers');
const {
    setReservation,
    updateReservation,
    getReservationsOrderedByDate,
    cancelReservations
} = require('../../repositories/DAO_Reservations');

const router = express.Router();


router.post('/insert_reservation', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { reservationData } = req.body;

    var response = await validateReservation(localId, reservationData);

    if (!response.success)
        return res.status(500).json({ code: response.code, error: response.error });

    const reservation = response.reservationData;


    response = await getCustomerByPhoneNumber(localId, reservationData.customer_phone_number);

    if (!response.success)
        return res.status(500).json({ error: '/insert_reservation (' + localId + ') (getCustomerByPhoneNumber): ' + response.error });


    var customerData;
    if (response.customerData.length > 0) {
        // Si el clientne existe, actualizar el contador "num_reservations"
        response = await updateCustomerReservationsCountByPhoneNumber(localId, reservationData.customer_phone_number);

        if (!response.success)
            return res.status(500).json({ error: '/insert_reservation (' + localId + ') (updateCustomerReservationsCountByPhoneNumber): ' + response.error });

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
            return res.status(500).json({ error: '/insert_reservation (' + localId + ') (setCustomer): ' + response.error });

        customerData = response.customerData;
    }


    // Añadir el identificador del cliente a la reserva
    reservation.customer_id = customerData.id;
    reservation.phone_number = customerData.phone_number;

    response = await setReservation(reservation);

    if (response.success)
        return res.status(200).json({ code: 1000, message: 'Created' });
    else
        return res.status(500).json({ error: '/insert_reservation (' + localId + ') (setReservation): ' + response.error });
});


router.get('/get_reservations', authenticateToken, async (req, res) => {
    const { localId } = req.localId;

    const response = await getReservationsOrderedByDate(localId);

    if (response.success)
        return res.status(200).json({ reservationsData: response.reservationsData })
    else
        return res.status(500).json({ error: '/get_reservations (' + localId + '): ' + response.error });
});


router.post('/edit_reservation', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { reservationData } = req.body;

    var response = await validateReservationExcludeReservation(localId, reservationData);

    const reservation = response.reservationData;

    if (!response.success)
        return res.status(500).json({ code: response.code, error: response.error });


    response = await getCustomerByPhoneNumber(localId, reservationData.customer_phone_number);

    if (!response.success)
        return res.status(500).json({ error: '/edit_reservation (' + localId + ') (getCustomerByPhoneNumber): ' + response.error });

    if (response.customerData.length > 1)
        return res.status(500).json({ error: 'El número de teléfono ya está registrado en otro cliente.' });

    reservation.customer_id = response.customerData[0].id;
    reservation.phone_number = response.customerData[0].phone_number;

    response = await updateReservation(reservation);

    if (!response.success)
        return res.status(500).json({ error: '/edit_reservation (' + localId + ') (updateReservation): ' + response.error });

    return res.status(200).json({ code: 1000, message: 'Updated' });
});


router.post('/validate_reservation', authenticateToken, async (req, res) => {
    const { localId } = req.localId;
    const { reservationData } = req.body;

    var response

    if (!reservationData.id) 
        response = await validateReservation(localId, reservationData);
    else 
        response = await validateReservationExcludeReservation(localId, reservationData);
        
    if (!response.success)
        return res.status(500).json({ code: response.code, error: response.error });
    return res.status(200).json({ code: 1000, message: 'Valid' });
});


router.post('/cancel_reservations', authenticateToken, async(req, res) => {
    const { localId }  = req.localId;
    const { reservationsData } = req.body;

    const response = await cancelReservations(localId, reservationsData);

    if(response.success)
        return res.status(200).json({ message: response.messages });
    else
        return res.status(500).json({ error: '/cancel_reservations (' + localId + '): ' + 'One or more reservations failed' });
});

module.exports = router;