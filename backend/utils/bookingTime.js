const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 18;

function roundToNextHalfHour(date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);

  const minutes = rounded.getMinutes();

  if (minutes === 0 || minutes === 30) {
    return rounded;
  }

  if (minutes < 30) {
    rounded.setMinutes(30);
    return rounded;
  }

  rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  return rounded;
}

function moveIntoServiceHours(date) {
  const scheduledAt = new Date(date);

  if (scheduledAt.getHours() < SLOT_START_HOUR) {
    scheduledAt.setHours(SLOT_START_HOUR, 0, 0, 0);
    return scheduledAt;
  }

  if (
    scheduledAt.getHours() >= SLOT_END_HOUR ||
    scheduledAt.getDay() === 0
  ) {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(SLOT_START_HOUR, 0, 0, 0);
  }

  return scheduledAt;
}

function parseMeridiemTime(timeText) {
  const match = timeText.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3].toLowerCase();

  if (meridiem === "pm" && hours < 12) {
    hours += 12;
  }

  if (meridiem === "am" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

function parseNamedTime(timeText) {
  if (/\bmorning\b/i.test(timeText)) {
    return { hours: 10, minutes: 0 };
  }

  if (/\bafternoon\b/i.test(timeText)) {
    return { hours: 14, minutes: 0 };
  }

  if (/\bevening\b/i.test(timeText)) {
    return { hours: 17, minutes: 0 };
  }

  if (/\bnight\b/i.test(timeText)) {
    return { hours: 20, minutes: 0 };
  }

  return null;
}

function parseDateOffset(timeText, now) {
  if (/\bday after tomorrow\b/i.test(timeText)) {
    return 2;
  }

  if (/\btomorrow\b/i.test(timeText)) {
    return 1;
  }

  if (/\btoday\b/i.test(timeText)) {
    return 0;
  }

  return null;
}

function decideDefaultBookingTime(provider, now = new Date()) {
  const responseMinutes = provider?.response_time_minutes || 60;
  const earliest = new Date(now.getTime() + Math.max(responseMinutes, 60) * 60000);

  return moveIntoServiceHours(roundToNextHalfHour(earliest));
}

function isMissingTime(timeText) {
  return (
    !timeText ||
    /^\s*$/.test(timeText) ||
    /^(null|none|not mentioned|not specified)$/i.test(timeText.trim())
  );
}

function resolveBookingTime(timeText, provider, now = new Date()) {
  if (isMissingTime(timeText)) {
    const scheduledAt = decideDefaultBookingTime(provider, now);

    return {
      scheduledAt,
      scheduledTime: scheduledAt.toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Karachi",
      }),
      timeWasProvided: false,
      timeDecisionReason:
        "No time was mentioned, so the next available service slot was selected.",
    };
  }

  const time = parseMeridiemTime(timeText) || parseNamedTime(timeText);
  const dateOffset = parseDateOffset(timeText, now);
  const scheduledAt = new Date(now);

  scheduledAt.setDate(scheduledAt.getDate() + (dateOffset ?? 0));

  if (time) {
    scheduledAt.setHours(time.hours, time.minutes, 0, 0);
  } else {
    const fallback = decideDefaultBookingTime(provider, now);
    scheduledAt.setHours(fallback.getHours(), fallback.getMinutes(), 0, 0);
  }

  if (scheduledAt <= now) {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
  }

  return {
    scheduledAt,
    scheduledTime: timeText,
    timeWasProvided: true,
    timeDecisionReason: "The requested booking time was used.",
  };
}

module.exports = {
  decideDefaultBookingTime,
  resolveBookingTime,
};
