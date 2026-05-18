const express = require("express");

const extractIntent = require("../agents/intentAgent");
const matchProviders = require("../agents/providerAgent");

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

    res.json({
      intent,
      providers,
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
