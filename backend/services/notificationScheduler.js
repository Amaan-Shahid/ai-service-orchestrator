const db = require("../config/firebase");
const {
  sendPushNotification,
} = require("./pushService");

const MAX_TIMEOUT_MS = 2147483647;
const POLL_INTERVAL_MS = Number(process.env.NOTIFICATION_POLL_INTERVAL_MS) || 60000;

const scheduledTimers = new Map();
let poller = null;

function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function markNotificationSent(notificationId, notification) {
  let pushResult = {
    sent: 0,
  };

  try {
    pushResult = await sendPushNotification(notification);
  } catch (error) {
    console.error("Push Notification Error:", error);
  }

  await db.runTransaction(async (transaction) => {
    const notificationRef = db.collection("notifications").doc(notificationId);
    const snapshot = await transaction.get(notificationRef);

    if (!snapshot.exists || snapshot.data().status !== "scheduled") {
      return;
    }

    transaction.update(notificationRef, {
      status: "sent",
      sentAt: new Date(),
      deliveryAttempts: (snapshot.data().deliveryAttempts || 0) + 1,
      pushSent: pushResult.sent || 0,
    });
  });

  console.log("Notification sent:", {
    id: notificationId,
    bookingId: notification.bookingId,
    type: notification.type,
    message: notification.message,
  });
}

function scheduleNotification(notification) {
  const scheduledFor = toDate(notification.scheduledFor);

  if (!notification.id || !scheduledFor || notification.status !== "scheduled") {
    return;
  }

  const delay = scheduledFor.getTime() - Date.now();

  if (scheduledTimers.has(notification.id)) {
    return;
  }

  const timeoutDelay = Math.min(Math.max(delay, 0), MAX_TIMEOUT_MS);
  const timeout = setTimeout(() => {
    scheduledTimers.delete(notification.id);

    if (delay > MAX_TIMEOUT_MS) {
      scheduleNotification(notification);
      return;
    }

    markNotificationSent(notification.id, notification).catch((error) => {
      console.error("Notification Scheduler Error:", error);
    });
  }, timeoutDelay);

  scheduledTimers.set(notification.id, timeout);
}

function scheduleNotifications(notifications) {
  if (!Array.isArray(notifications)) {
    return;
  }

  notifications.forEach(scheduleNotification);
}

async function schedulePendingNotifications() {
  const snapshot = await db
    .collection("notifications")
    .where("status", "==", "scheduled")
    .get();

  snapshot.forEach((doc) => {
    scheduleNotification({
      id: doc.id,
      ...doc.data(),
    });
  });
}

function startNotificationScheduler() {
  if (poller) {
    return;
  }

  schedulePendingNotifications().catch((error) => {
    console.error("Failed to schedule pending notifications:", error);
  });

  poller = setInterval(() => {
    schedulePendingNotifications().catch((error) => {
      console.error("Failed to schedule pending notifications:", error);
    });
  }, POLL_INTERVAL_MS);
}

module.exports = {
  scheduleNotification,
  scheduleNotifications,
  schedulePendingNotifications,
  startNotificationScheduler,
};
