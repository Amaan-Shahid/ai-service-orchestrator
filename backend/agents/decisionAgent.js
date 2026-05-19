function generateDecision(provider, intent) {
  if (!provider) {
    return {
      summary:
        "No suitable provider was found.",
      reasoning: [],
      reasoningFactors: [],
    };
  }

  const reasons = [];
  const reasoning = [
    `Rating: ${provider.rating}`,
    `Distance: ${provider.distance_km} km`,
    `Response time: ${provider.response_time_minutes} mins`,
    `${provider.completed_jobs} completed jobs`,
  ];

  if (provider.rating >= 4.7) {
    reasons.push(
      "high customer ratings"
    );
  }

  if (provider.distance_km <= 3) {
    reasons.push(
      "close proximity to your location"
    );
  }

  if (provider.response_time_minutes <= 30) {
    reasons.push(
      "fast response time"
    );
  }

  if (provider.experience_years >= 8) {
    reasons.push(
      "strong professional experience"
    );
  }

  if (provider.completed_jobs >= 300) {
    reasons.push(
      "large number of completed jobs"
    );
  }

  reasoning.push(
    provider.locationMatch
      ? `Available in ${provider.location}`
      : `No available ${provider.service} found in ${intent.location}; showing best available alternative`
  );

  const reasonText = reasons.length
    ? reasons.join(", ")
    : "the strongest available provider score";

  const summary =
    `${provider.name} was selected for your ` +
    `${intent.service} request because of ` +
    `${reasonText}.`;

  return {
    providerId: provider.id,

    providerName: provider.name,

    summary,

    reasoning,

    reasoningFactors: reasons,
  };
}

module.exports = generateDecision;
