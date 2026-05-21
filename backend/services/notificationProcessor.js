const db = require("../config/firebase");
const {
  sendPushNotification,
} = require("./pushService");

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

async function processPendingNotifications() {
  const now = new Date();
  const snapshot = await db
    .collection("notifications")
    .where("status", "==", "scheduled")
    .get();

  let processed = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const notification = doc.data();
    const scheduledFor = toDate(notification.scheduledFor);

    if (!scheduledFor || scheduledFor > now) {
      skipped += 1;
      continue;
    }

    console.log("Notification sent:", {
      id: doc.id,
      bookingId: notification.bookingId,
      type: notification.type,
      message: notification.message,
    });

    let pushResult = {
      sent: 0,
    };

    try {
      pushResult = await sendPushNotification(notification);
    } catch (error) {
      console.error("Push Notification Error:", error);
    }

    await doc.ref.update({
      status: "sent",
      sentAt: now,
      deliveryAttempts: (notification.deliveryAttempts || 0) + 1,
      pushSent: pushResult.sent || 0,
    });

    processed += 1;
  }

  return {
    processed,
    skipped,
  };
}

module.exports = {
  processPendingNotifications,
};
