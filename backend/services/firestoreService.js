const db = require("../config/firebase");
const withTimeout = require("../utils/asyncTimeout");

const FIRESTORE_TIMEOUT_MS = Number(process.env.FIRESTORE_TIMEOUT_MS) || 10000;

const BOOKING_STATUS_STEPS = [
  "confirmed",
  "provider_assigned",
  "provider_on_the_way",
  "completed",
];

const STATUS_NOTIFICATION_MESSAGES = {
  confirmed: (booking) =>
    `Provider found! ${booking.provider?.name || "Your provider"} has been matched for your ${booking.service} service.`,
  provider_assigned: (booking) =>
    `${booking.provider?.name || "Your provider"} confirmed your ${booking.service} booking.`,
  provider_on_the_way: (booking) =>
    `${booking.provider?.name || "Your provider"} is on the way for your ${booking.service} service.`,
  completed: (booking) =>
    `${booking.customer?.username || "The customer"} marked the ${booking.service} job as completed.`,
  cancelled: (booking, actorRole) =>
    actorRole === "provider"
      ? `${booking.provider?.name || "Your provider"} cancelled your ${booking.service} booking.`
      : `${booking.customer?.username || "The customer"} cancelled the ${booking.service} booking.`,
};

function notificationTargetForStatus(booking, nextStatus, actorRole) {
  if (["provider_assigned", "provider_on_the_way"].includes(nextStatus)) {
    const username = booking.customer?.username;

    return username
      ? {
          recipientRole: "user",
          recipientUsername: username,
        }
      : null;
  }

  if (nextStatus === "completed" && booking.provider?.id) {
    return {
      recipientRole: "provider",
      recipientProviderId: Number(booking.provider.id),
    };
  }

  if (nextStatus === "cancelled") {
    if (actorRole === "provider" && booking.customer?.username) {
      return {
        recipientRole: "user",
        recipientUsername: booking.customer.username,
      };
    }

    if (actorRole === "user" && booking.provider?.id) {
      return {
        recipientRole: "provider",
        recipientProviderId: Number(booking.provider.id),
      };
    }
  }

  return null;
}

function toFirestoreDate(value) {
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

async function saveBooking(booking) {
  try {
    const createdAt = new Date();
    const bookingToSave = {
      ...booking,
      scheduledAt: toFirestoreDate(booking.scheduledAt),
      statusUpdatedAt: createdAt,
      statusHistory: [
        {
          status: booking.status,
          actorRole: "system",
          changedAt: createdAt,
        },
      ],
      createdAt,
    };

    const docRef = await withTimeout(
      db.collection("bookings").add(bookingToSave),
      FIRESTORE_TIMEOUT_MS,
      "Firestore booking save timed out"
    );

    return {
      id: docRef.id,
      ...bookingToSave,
    };
  } catch (error) {
    console.error(
      "Firestore Save Booking Error:",
      error
    );

    throw error;
  }
}

function serializeFirestoreDate(value) {
  const date = toFirestoreDate(value);
  return date ? date.toISOString() : null;
}

function serializeBooking(doc) {
  const data = doc.data ? doc.data() : doc;

  return {
    id: doc.id || data.id,
    ...data,
    scheduledAt: serializeFirestoreDate(data.scheduledAt),
    createdAt: serializeFirestoreDate(data.createdAt),
    updatedAt: serializeFirestoreDate(data.updatedAt),
    statusUpdatedAt: serializeFirestoreDate(data.statusUpdatedAt),
  };
}

async function listBookings({ role, username, providerId }) {
  let query = db.collection("bookings");

  if (role === "provider") {
    query = query.where("provider.id", "==", Number(providerId));
  } else if (username) {
    query = query.where("customer.username", "==", username);
  }

  const snapshot = await withTimeout(
    query.get(),
    FIRESTORE_TIMEOUT_MS,
    "Firestore booking list timed out"
  );
  const bookings = [];

  snapshot.forEach((doc) => {
    bookings.push(serializeBooking(doc));
  });

  return bookings.sort((a, b) => {
    const createdA = new Date(a.createdAt || 0).getTime();
    const createdB = new Date(b.createdAt || 0).getTime();
    return createdB - createdA;
  });
}

function assertValidStatusTransition(currentStatus, nextStatus, actorRole) {
  if (nextStatus === "cancelled") {
    if (["completed", "cancelled", "failed"].includes(currentStatus)) {
      const error = new Error("completed or cancelled bookings cannot be cancelled");
      error.statusCode = 400;
      throw error;
    }

    if (!["user", "provider"].includes(actorRole)) {
      const error = new Error("only user or provider can cancel a booking");
      error.statusCode = 403;
      throw error;
    }

    return;
  }

  const currentIndex = BOOKING_STATUS_STEPS.indexOf(currentStatus);
  const nextIndex = BOOKING_STATUS_STEPS.indexOf(nextStatus);

  if (nextIndex === -1) {
    const error = new Error("invalid booking status");
    error.statusCode = 400;
    throw error;
  }

  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    const error = new Error(
      `booking status can only move to the next step: ${BOOKING_STATUS_STEPS.join(" -> ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    actorRole === "provider" &&
    !["provider_assigned", "provider_on_the_way"].includes(nextStatus)
  ) {
    const error = new Error("provider can only confirm assignment or mark on the way");
    error.statusCode = 403;
    throw error;
  }

  if (actorRole === "user" && nextStatus !== "completed") {
    const error = new Error("user can only confirm completion");
    error.statusCode = 403;
    throw error;
  }
}

async function updateBookingStatus({ bookingId, nextStatus, actorRole, username, providerId }) {
  const bookingRef = db.collection("bookings").doc(bookingId);
  let updatedBooking = null;

  await withTimeout(
    db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(bookingRef);

      if (!snapshot.exists) {
        const error = new Error("booking not found");
        error.statusCode = 404;
        throw error;
      }

      const booking = snapshot.data();

      if (actorRole === "provider" && booking.provider?.id !== Number(providerId)) {
        const error = new Error("provider is not assigned to this booking");
        error.statusCode = 403;
        throw error;
      }

      if (
        actorRole === "user" &&
        booking.customer?.username &&
        booking.customer.username !== username
      ) {
        const error = new Error("user is not allowed to update this booking");
        error.statusCode = 403;
        throw error;
      }

      assertValidStatusTransition(booking.status, nextStatus, actorRole);

      const now = new Date();
      const statusHistory = Array.isArray(booking.statusHistory)
        ? booking.statusHistory
        : [
            {
              status: booking.status,
              actorRole: "system",
              changedAt: booking.createdAt || now,
            },
          ];

      const updates = {
        status: nextStatus,
        statusUpdatedAt: now,
        updatedAt: now,
        statusHistory: [
          ...statusHistory,
          {
            status: nextStatus,
            actorRole,
            username: username || null,
            providerId: providerId || null,
            changedAt: now,
          },
        ],
      };

      transaction.update(bookingRef, updates);

      const notificationTarget = notificationTargetForStatus(
        booking,
        nextStatus,
        actorRole
      );

      if (STATUS_NOTIFICATION_MESSAGES[nextStatus] && notificationTarget) {
        const notificationRef = db.collection("notifications").doc();

        transaction.set(notificationRef, {
          type: nextStatus,
          scheduledFor: now,
          status: "scheduled",
          channel: "in_app",
          message: STATUS_NOTIFICATION_MESSAGES[nextStatus](booking, actorRole),
          bookingDocId: snapshot.id,
          bookingId: booking.bookingId,
          service: booking.service,
          provider: booking.provider,
          customer: booking.customer || null,
          ...notificationTarget,
          deliveryAttempts: 0,
          createdAt: now,
        });
      }

      updatedBooking = serializeBooking({
        id: snapshot.id,
        ...booking,
        ...updates,
      });
    }),
    FIRESTORE_TIMEOUT_MS,
    "Firestore booking status update timed out"
  );

  return updatedBooking;
}

async function saveNotifications(booking, notifications) {
  if (!Array.isArray(notifications) || !notifications.length) {
    return [];
  }

  try {
    const savedNotifications = [];

    for (const notification of notifications) {
      if (!notification.recipientRole) {
        continue;
      }

      const createdAt = new Date();
      const notificationToSave = {
        ...notification,
        scheduledFor: toFirestoreDate(notification.scheduledFor),
        bookingDocId: booking.id,
        bookingId: booking.bookingId,
        service: booking.service,
        provider: booking.provider,
        customer: booking.customer || null,
        status: notification.status || "scheduled",
        channel: notification.channel || "in_app",
        deliveryAttempts: 0,
        createdAt,
      };

      const docRef = await withTimeout(
        db.collection("notifications").add(notificationToSave),
        FIRESTORE_TIMEOUT_MS,
        "Firestore notification save timed out"
      );

      savedNotifications.push({
        id: docRef.id,
        ...notificationToSave,
      });
    }

    return savedNotifications;
  } catch (error) {
    console.error("Firestore Save Notifications Error:", error);

    throw error;
  }
}

async function listNotifications({ role, username, providerId }) {
  let query = db.collection("notifications").where("recipientRole", "==", role);

  const snapshot = await withTimeout(
    query.get(),
    FIRESTORE_TIMEOUT_MS,
    "Firestore notification list timed out"
  );
  const notifications = [];
  const normalizedUsername = username?.trim().toLowerCase() || "";
  const numericProviderId = providerId ? Number(providerId) : null;

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (
      role === "user" &&
      data.recipientUsername !== normalizedUsername
    ) {
      return;
    }

    if (
      role === "provider" &&
      Number(data.recipientProviderId) !== numericProviderId
    ) {
      return;
    }

    notifications.push({
      id: doc.id,
      ...data,
      scheduledFor: serializeFirestoreDate(data.scheduledFor),
      createdAt: serializeFirestoreDate(data.createdAt),
      sentAt: serializeFirestoreDate(data.sentAt),
    });
  });

  return notifications.sort((a, b) => {
    const createdA = new Date(a.createdAt || a.scheduledFor || 0).getTime();
    const createdB = new Date(b.createdAt || b.scheduledFor || 0).getTime();
    return createdB - createdA;
  });
}

module.exports = {
  BOOKING_STATUS_STEPS,
  listNotifications,
  listBookings,
  saveBooking,
  saveNotifications,
  updateBookingStatus,
};
