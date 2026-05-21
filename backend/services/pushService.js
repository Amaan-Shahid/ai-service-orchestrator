const db = require("../config/firebase");
const withTimeout = require("../utils/asyncTimeout");

const FIRESTORE_TIMEOUT_MS = Number(process.env.FIRESTORE_TIMEOUT_MS) || 10000;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function normalizeUsername(username) {
  return username?.trim().toLowerCase() || "";
}

async function savePushToken({ role, username, providerId, token }) {
  if (!["user", "provider"].includes(role) || !token) {
    const error = new Error("role and token are required");
    error.statusCode = 400;
    throw error;
  }

  const recipientKey =
    role === "provider"
      ? `provider:${Number(providerId)}`
      : `user:${normalizeUsername(username)}`;

  if (role === "provider" && !providerId) {
    const error = new Error("providerId is required for provider notifications");
    error.statusCode = 400;
    throw error;
  }

  if (role === "user" && !normalizeUsername(username)) {
    const error = new Error("username is required for user notifications");
    error.statusCode = 400;
    throw error;
  }

  const savedAt = new Date();
  await withTimeout(
    db.collection("pushTokens").doc(`${recipientKey}:${token}`).set(
      {
        role,
        username: role === "user" ? normalizeUsername(username) : null,
        providerId: role === "provider" ? Number(providerId) : null,
        token,
        updatedAt: savedAt,
      },
      { merge: true }
    ),
    FIRESTORE_TIMEOUT_MS,
    "Firestore push token save timed out"
  );
}

async function listTokensForNotification(notification) {
  let query = db
    .collection("pushTokens")
    .where("role", "==", notification.recipientRole);

  const snapshot = await withTimeout(
    query.get(),
    FIRESTORE_TIMEOUT_MS,
    "Firestore push token lookup timed out"
  );
  const tokens = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (
      notification.recipientRole === "user" &&
      data.username !== normalizeUsername(notification.recipientUsername)
    ) {
      return;
    }

    if (
      notification.recipientRole === "provider" &&
      Number(data.providerId) !== Number(notification.recipientProviderId)
    ) {
      return;
    }

    if (data.token) {
      tokens.push(data.token);
    }
  });

  return [...new Set(tokens)];
}

async function sendPushNotification(notification) {
  const tokens = await listTokensForNotification(notification);

  if (!tokens.length || typeof fetch !== "function") {
    return {
      sent: 0,
    };
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: "Servio",
    body: notification.message,
    data: {
      bookingId: notification.bookingId,
      type: notification.type,
    },
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push failed with status ${response.status}`);
  }

  return {
    sent: messages.length,
  };
}

module.exports = {
  savePushToken,
  sendPushNotification,
};
