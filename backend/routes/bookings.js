const express = require("express");
const {
  BOOKING_STATUS_STEPS,
  listBookings,
  updateBookingStatus,
} = require("../services/firestoreService");
const {
  schedulePendingNotifications,
} = require("../services/notificationScheduler");

const router = express.Router();

function normalizeUsername(username) {
  return username?.trim().toLowerCase() || "";
}

function sendBookingError(res, error) {
  res.status(error.statusCode || 500).json({
    error: error.message || "Booking request failed",
  });
}

router.get("/", async (req, res) => {
  try {
    const role = req.query.role || "user";
    const username = normalizeUsername(req.query.username);
    const providerId = req.query.providerId ? Number(req.query.providerId) : null;

    if (!["user", "provider"].includes(role)) {
      return res.status(400).json({
        error: "role must be user or provider",
      });
    }

    if (role === "provider" && !providerId) {
      return res.status(400).json({
        error: "providerId is required for provider bookings",
      });
    }

    const bookings = await listBookings({
      role,
      username,
      providerId,
    });

    res.json({
      steps: BOOKING_STATUS_STEPS,
      bookings,
    });
  } catch (error) {
    sendBookingError(res, error);
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const role = req.body.role || req.body.actorRole;
    const username = normalizeUsername(req.body.username);
    const providerId = req.body.providerId ? Number(req.body.providerId) : null;
    const nextStatus = req.body.status;

    if (!["user", "provider"].includes(role)) {
      return res.status(400).json({
        error: "role must be user or provider",
      });
    }

    if (role === "provider" && !providerId) {
      return res.status(400).json({
        error: "providerId is required for provider status updates",
      });
    }

    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      nextStatus,
      actorRole: role,
      username,
      providerId,
    });
    schedulePendingNotifications().catch((error) => {
      console.error("Failed to schedule status notification:", error);
    });

    res.json({
      steps: BOOKING_STATUS_STEPS,
      booking,
    });
  } catch (error) {
    sendBookingError(res, error);
  }
});

module.exports = router;
