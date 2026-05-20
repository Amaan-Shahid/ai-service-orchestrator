const { resolveBookingTime } = require("../utils/bookingTime");

function generateBookingId() {
  const random = Math.floor(100 + Math.random() * 900);

  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `BK-${year}${month}${day}-${random}`;
}

function generateEstimatedCost(service) {
  const pricing = {
    "AC Technician": "Rs. 2,000 - 5,000",
    Electrician: "Rs. 1,500 - 4,000",
    Plumber: "Rs. 1,000 - 3,500",
    Tutor: "Rs. 3,000 - 15,000",
    Beautician: "Rs. 2,500 - 10,000",
    Carpenter: "Rs. 2,000 - 8,000",
    Painter: "Rs. 5,000 - 25,000",
    "Mobile Repair": "Rs. 500 - 8,000",
    "Home Cleaner": "Rs. 1,500 - 4,000",
  };

  return pricing[service] || "Price will be discussed";
}

function createBooking(intent, matchedProviders, decision) {
  if (!intent || !Array.isArray(matchedProviders) || !matchedProviders.length) {
    return {
      status: "failed",
      message: "No providers available",
    };
  }

  const selectedProvider = matchedProviders[0];
  const bookingTime = resolveBookingTime(intent.time, selectedProvider);

  const booking = {
    bookingId: generateBookingId(),

    status: "confirmed",

    service: intent.service,

    location: intent.location,

    scheduledTime: bookingTime.scheduledTime,

    scheduledAt: bookingTime.scheduledAt,

    timeWasProvided: bookingTime.timeWasProvided,

    timeDecisionReason: bookingTime.timeDecisionReason,

    estimatedCost: generateEstimatedCost(selectedProvider.service),

    provider: {
      id: selectedProvider.id,
      name: selectedProvider.name,
      phone: selectedProvider.phone,
      rating: selectedProvider.rating,
    },

    reasoning: decision?.reasoning || [],

    confirmationMessage:
      `Booking confirmed! ${selectedProvider.name} ` +
      `will contact you shortly for ${intent.service} service. ` +
      `Scheduled for ${bookingTime.scheduledTime}.`,
  };

  return booking;
}

module.exports = createBooking;
