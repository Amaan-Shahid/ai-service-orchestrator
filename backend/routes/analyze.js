const express = require("express");

const extractIntent = require("../agents/intentAgent");
const matchProviders = require("../agents/providerAgent");
const createBooking = require("../agents/bookingAgent");
const createNotifications = require("../agents/notificationAgent");
const generateDecision = require("../agents/decisionAgent");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const intent = await extractIntent(message);
    const providers = matchProviders(intent);
    const bestProvider = providers[0] || null;

    const decision =
      generateDecision(
        bestProvider,
        intent
      );

    const booking = createBooking(intent, providers, decision);

    const notifications = createNotifications(booking);

    res.json({
      intent,
      bestProvider,
      providers,
      decision,
      booking,
      notifications,
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
