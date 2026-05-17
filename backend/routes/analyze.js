const express = require("express");

const extractIntent = require("../agents/intentAgent");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    const extractedData = await extractIntent(message);

    res.json(extractedData);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to analyze request",
    });
  }
});

module.exports = router;