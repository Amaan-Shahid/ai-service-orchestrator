const dataset = require("../dataset/providers.json");

const providers = dataset.providers;

function normalizeText(text) {
  return text?.toLowerCase().trim();
}

function calculateScore(provider) {
  let score = 0;

  score += provider.rating * 20;

  score += Math.max(0, 30 - provider.distance_km * 2);

  score += Math.max(0, 20 - provider.response_time_minutes / 5);

  score += Math.min(provider.completed_jobs / 20, 20);

  score += Math.min(provider.experience_years, 10);

  return score;
}

function matchProviders(intent) {
  const { service, location } = intent;

  const matchedProviders = providers
    .filter((provider) => {
      const serviceMatch =
        normalizeText(provider.service) === normalizeText(service);

      const locationMatch =
        normalizeText(provider.location) === normalizeText(location);

      return serviceMatch && locationMatch && provider.available;
    })
    .map((provider) => ({
      ...provider,
      score: calculateScore(provider),
      reasoning: [
        `Rating: ${provider.rating}`,
        `Distance: ${provider.distance_km} km`,
        `Response time: ${provider.response_time_minutes} mins`,
        `${provider.completed_jobs} completed jobs`,
      ],
    }))
    .sort((a, b) => b.score - a.score);

  return matchedProviders;
}

module.exports = matchProviders;
