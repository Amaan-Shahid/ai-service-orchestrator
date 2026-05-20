const express = require("express");

const extractIntent = require("../agents/intentAgent");
const matchProviders = require("../agents/providerAgent");
const createBooking = require("../agents/bookingAgent");
const createNotifications = require("../agents/notificationAgent");
const generateDecision = require("../agents/decisionAgent");
const {
  saveBooking,
  saveNotifications,
} = require("../services/firestoreService");
const { scheduleNotifications } = require("../services/notificationScheduler");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message, username } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const intent = await extractIntent(message);
    const providers = matchProviders(intent);
    const bestProvider = providers[0] || null;

    const decision = generateDecision(bestProvider, intent);

    if (!bestProvider) {
      return res.status(404).json({
        serviceAvailable: false,
        error:
          "Service is not available for this request. Please try another service or area.",
        intent,
        providers: [],
        decision,
        total: 0,
      });
    }

    const booking = createBooking(intent, providers, decision);

    if (username && booking.status === "confirmed") {
      booking.customer = {
        username: username.trim().toLowerCase(),
      };
    }

    const savedBooking = await saveBooking(booking);

    const notifications = createNotifications(savedBooking);
    const savedNotifications = await saveNotifications(
      savedBooking,
      notifications
    );

    scheduleNotifications(savedNotifications);

    res.json({
      intent,
      bestProvider,
      providers,
      decision,
      booking,
      savedBooking,
      notifications: savedNotifications,
      total: providers.length,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to analyze request",
    });
  }
});

module.exports = router;
