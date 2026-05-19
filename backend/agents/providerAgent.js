const dataset = require("../dataset/providers.json");

const providers = dataset.providers;

function normalizeText(text) {
  return text?.toLowerCase().trim() || "";
}

function compactText(text) {
  return normalizeText(text).replace(/[^a-z0-9]/g, "");
}

const serviceAliases = {
  "AC Technician": [
    "ac",
    "ac repair",
    "ac service",
    "ac technician",
    "air conditioner",
    "air conditioning",
    "hvac",
  ],
  Beautician: ["beautician", "beauty", "makeup", "salon", "parlor", "parlour"],
  Carpenter: ["carpenter", "carpentry", "wood work", "woodwork", "furniture"],
  Electrician: [
    "electrician",
    "electric",
    "electrical",
    "electric repair",
    "wiring",
  ],
  "Home Cleaner": [
    "cleaner",
    "cleaning",
    "home cleaner",
    "house cleaning",
    "maid",
  ],
  "Mobile Repair": [
    "mobile",
    "mobile repair",
    "phone",
    "phone repair",
    "cell phone",
  ],
  Painter: ["painter", "painting", "paint"],
  Plumber: ["plumber", "plumbing", "pipe", "leak", "water leak"],
  Tutor: ["tutor", "tuition", "teacher", "teaching", "home tutor"],
};

function canonicalService(service) {
  const normalizedService = normalizeText(service);
  const compactService = compactText(service);

  return Object.entries(serviceAliases).find(([name, aliases]) => {
    const serviceNames = [name, ...aliases];

    return serviceNames.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      const compactAlias = compactText(alias);

      return (
        normalizedService === normalizedAlias ||
        compactService === compactAlias ||
        normalizedService.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedService)
      );
    });
  })?.[0];
}

function canonicalLocation(location) {
  const compactLocation = compactText(location);

  return [...new Set(providers.map((provider) => provider.location))].find(
    (providerLocation) => compactLocation.includes(compactText(providerLocation))
  );
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
  if (!intent) {
    return [];
  }

  const { service, location } = intent;
  const matchedService = canonicalService(service);
  const matchedLocation = canonicalLocation(location);

  if (!matchedService || !matchedLocation) {
    return [];
  }

  const availableServiceProviders = providers
    .filter((provider) => {
      const serviceMatch = provider.service === matchedService;
      return serviceMatch && provider.available;
    })
    .map((provider) => ({
      ...provider,
      score: calculateScore(provider),
      locationMatch: provider.location === matchedLocation,
    }));

  const exactLocationProviders = availableServiceProviders.filter(
    (provider) => provider.locationMatch
  );

  const matchedProviders =
    exactLocationProviders.length > 0
      ? exactLocationProviders
      : availableServiceProviders;

  matchedProviders.sort((a, b) => b.score - a.score);

  return matchedProviders;
}

module.exports = matchProviders;
