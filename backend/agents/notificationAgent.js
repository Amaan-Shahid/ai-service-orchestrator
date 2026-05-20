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
  const providerArrival = scheduledAt;
  const reminderScheduledFor = reminder1Hour > now ? reminder1Hour : now;
  const reminderMessage =
    reminder1Hour > now
      ? `Reminder: ${booking.provider.name} is scheduled for your ${booking.service} service in one hour.`
      : `Reminder: ${booking.provider.name} is scheduled soon for your ${booking.service} service.`;

  return [
    {
      type: "reminder",
      scheduledFor: reminderScheduledFor,
      status: "scheduled",
      channel: "in_app",
      message: reminderMessage,
    },

    {
      type: "provider_on_the_way",
      scheduledFor: providerArrival,
      status: "scheduled",
      channel: "in_app",
      message:
        `${booking.provider.name} is scheduled to arrive for your ${booking.service} service.`,
    },
  ];
}

module.exports = createScheduledNotifications;
