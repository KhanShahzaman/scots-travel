function logEmail(event, recipient, payload) {
  // Replace this with Resend/SendGrid integration when keys are available.
  console.info(`[email:${event}]`, {
    recipient,
    ...payload,
  });
}

function vehicleLabelFromBooking(booking, fallbackLabel = "") {
  if (fallbackLabel) return fallbackLabel;
  if (booking?.vehicleId && typeof booking.vehicleId === "object" && booking.vehicleId.name) {
    return booking.vehicleId.name;
  }
  return booking.vehicleName || booking.vehicleClass || booking.vehicleCode || "Selected Vehicle";
}

export async function sendBookingConfirmationEmail(booking, vehicleLabel = "") {
  logEmail("booking_confirmed", booking.customerEmail, {
    bookingId: booking.bookingNumber || booking.bookingRef,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    pickupAt: booking.pickupAt,
    vehicle: vehicleLabelFromBooking(booking, vehicleLabel),
    total: booking.total,
    currency: booking.currency,
  });
}

export async function sendDriverAssignedEmail(booking, driverName) {
  logEmail("driver_assigned", booking.customerEmail, {
    bookingId: booking.bookingNumber || booking.bookingRef,
    driverName,
    pickup: booking.pickup,
    pickupAt: booking.pickupAt,
    vehicle: vehicleLabelFromBooking(booking),
    supportEmail: process.env.SUPPORT_EMAIL || "support@scottravels.test",
  });
}

export async function sendThankYouEmail(booking) {
  logEmail("ride_completed", booking.customerEmail, {
    bookingId: booking.bookingNumber || booking.bookingRef,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    total: booking.total,
    currency: booking.currency,
  });
}
