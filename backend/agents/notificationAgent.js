function createScheduledNotifications(booking) {
  if (booking.status !== "confirmed") {
    return [];
  }

  const now = new Date();
  const scheduledAt = new Date(booking.scheduledAt);

  if (Number.isNaN(scheduledAt.getTime())) {
    return [];
  }

  const reminder1Hour = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
  const reminderScheduledFor = reminder1Hour > now ? reminder1Hour : now;
  const reminderMessage =
    reminder1Hour > now
      ? `Reminder: ${booking.provider.name} is scheduled for your ${booking.service} service in one hour.`
      : `Reminder: ${booking.provider.name} is scheduled soon for your ${booking.service} service.`;

  return [
    {
      type: "provider_found",
      scheduledFor: now,
      status: "scheduled",
      channel: "in_app",
      recipientRole: "provider",
      recipientProviderId: booking.provider.id,
      message:
        `New ${booking.service} booking found for ${booking.location || "your area"}.`,
    },

    {
      type: "reminder",
      scheduledFor: reminderScheduledFor,
      status: "scheduled",
      channel: "in_app",
      recipientRole: "user",
      recipientUsername: booking.customer?.username || null,
      message: reminderMessage,
    },
  ];
}

module.exports = createScheduledNotifications;
