const express = require("express");

const {
  processPendingNotifications,
} = require("../services/notificationProcessor");
const {
  listNotifications,
} = require("../services/firestoreService");
const {
  savePushToken,
} = require("../services/pushService");

const router = express.Router();

function normalizeUsername(username) {
  return username?.trim().toLowerCase() || "";
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

    if (role === "user" && !username) {
      return res.status(400).json({
        error: "username is required for user notifications",
      });
    }

    if (role === "provider" && !providerId) {
      return res.status(400).json({
        error: "providerId is required for provider notifications",
      });
    }

    const notifications = await listNotifications({
      role,
      username,
      providerId,
    });

    res.json({
      notifications,
    });
  } catch (error) {
    console.error("Notification list failed:", error);

    res.status(500).json({
      error: "Failed to load notifications",
    });
  }
});

router.post("/register-token", async (req, res) => {
  try {
    await savePushToken(req.body);

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Failed to register notification token",
    });
  }
});

router.post("/process", async (req, res) => {
  try {
    const expectedSecret = process.env.NOTIFICATION_PROCESSOR_SECRET;

    if (
      expectedSecret &&
      req.get("x-scheduler-secret") !== expectedSecret
    ) {
      return res.status(401).json({
        error: "unauthorized",
      });
    }

    const result = await processPendingNotifications();

    res.json({
      success: true,
      message: "Notifications processed",
      ...result,
    });
  } catch (error) {
    console.error("Notification processing failed:", error);

    res.status(500).json({
      error: "Failed to process notifications",
    });
  }
});

module.exports = router;
