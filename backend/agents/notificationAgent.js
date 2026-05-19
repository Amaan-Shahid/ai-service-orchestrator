function createScheduledNotifications(booking) {
  if (booking.status !== "confirmed") {
    return [];
  }

  const now = new Date();

  const reminder1Hour = new Date(now.getTime() + 60 * 60 * 1000);

  const providerArrival = new Date(now.getTime() + 90 * 60 * 1000);

  const completion = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  return [
    {
      type: "reminder",

      scheduledFor: reminder1Hour,

      status: "scheduled",

      message:
        `Reminder: ${booking.provider.name} ` +
        `is scheduled for your ${booking.service} service.`,
    },

    {
      type: "provider_on_the_way",

      scheduledFor: providerArrival,

      status: "scheduled",

      message:
        `${booking.provider.name} is on the way.`,
    },

    {
      type: "job_completed",

      scheduledFor: completion,

      status: "pending",

      message:
        `Your ${booking.service} service has been completed.`,
    },
  ];
}

module.exports = createScheduledNotifications;